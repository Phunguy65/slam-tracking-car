# Context

The current face tracking system uses MediaPipe/OpenCV for face detection and publishes face positions on `/face_detections` (PoseArray). A separate controller subscribes and generates `/cmd_vel` commands. This works for basic demos but has critical limitations:
- Cannot distinguish between people (follows any face)
- Loses tracking when face is not visible (person turns away)
- No way to specify who to follow

The new system introduces person enrollment (learn faces) and body-based tracking (robust even when face not visible).

**Current state:**
- `face_tracker_node.py`: MediaPipe face detection → `/face_detections` (PoseArray)
- `face_follow_controller.py`: PID control → `/cmd_vel` (wheels only)
- ESP32-CAM streams MJPEG via HTTP, consumed by `cam_bridge_node.py`
- Servo pan/tilt exists in firmware but no ROS2 node publishes to `/servo_cmd`
- Next.js app at `app/` has tracking page with camera view and PID tuner

**Constraints:**
- Detection/recognition runs on laptop (no GPU on robot)
- ESP32-CAM resolution: 640x480 @ 10fps
- Latency budget: <200ms end-to-end for responsive tracking
- SQLite for simplicity (single-user, no concurrent writes needed)

## Goals / Non-Goals

**Goals:**
- Enable enrollment of specific people via laptop webcam with visual feedback (scan effect)
- Track enrolled persons robustly using body detection (even when face not visible)
- Re-identify persons by face embedding when face becomes visible
- Coordinate servo pan + wheel movement for smooth tracking
- Provide search behavior when target is lost

**Non-Goals:**
- Multi-person tracking (follow multiple people simultaneously)
- Re-enrollment / updating existing person's embedding
- GPU acceleration (CPU-only for portability)
- Full WCAG accessibility (basic a11y only)
- Automated test coverage

## Decisions

### D1: Face Embedding Model — InsightFace (buffalo_l)

**Choice:** InsightFace with buffalo_l model

**Alternatives considered:**
- FaceNet (128D): Good accuracy but requires PyTorch, less maintained
- dlib face_recognition: Easy but lower accuracy (99.38% vs 99.86%)
- ArcFace: Similar to InsightFace but requires mxnet

**Rationale:** InsightFace provides SOTA accuracy (99.86% on LFW), uses ONNX runtime (fast CPU inference), and includes detection + alignment + embedding in one package. buffalo_l model balances accuracy and speed.

### D2: Body Detection Model — YOLOv8n

**Choice:** YOLOv8 nano variant

**Alternatives considered:**
- MediaPipe Pose: Lighter but limited multi-person support, outputs keypoints not bboxes
- YOLOv8s: More accurate but 2x slower (~60ms vs ~30ms)
- YOLOv5: Older, less maintained

**Rationale:** YOLOv8n achieves ~30fps on CPU with acceptable accuracy (37.3 mAP). Clean bbox output integrates easily. "person" class detection is reliable.

### D3: Webcam Stream — getUserMedia + base64 via rosbridge

**Choice:** Browser captures frames, encodes as base64 JPEG, publishes via existing roslib WebSocket

**Alternatives considered:**
- True WebRTC with aiortc: Lower latency but requires signaling server, new ROS2 node, complex setup
- HTTP POST to API route: Extra server, doesn't fit ROS2 architecture

**Rationale:** Reuses existing rosbridge infrastructure. ~10fps is sufficient for enrollment (not real-time tracking). Implementation is ~20 lines using existing `usePublisher` hook. Tradeoff: higher latency than WebRTC, but acceptable for enrollment use case.

### D4: Enrollment Data Path — ROS2 Services

**Choice:** All DB operations via ROS2 services (AddPerson.srv, RemovePerson.srv, etc.)

**Alternatives considered:**
- Next.js API routes: Standard web pattern but creates two processes accessing DB, needs WAL mode, state sync complexity

**Rationale:** Single process (enrollment_node) owns the SQLite database. No concurrent write issues. Fits ROS2 service-oriented architecture. Existing `useService` hook in app makes this straightforward.

### D5: Topic Contract — New TrackedPersonArray message

**Choice:** Create custom TrackedPersonArray.msg, remove old PoseArray hack

**Alternatives considered:**
- Reuse PoseArray: Quick but hacky (position.z = width is confusing), no fields for person_id, confidence, is_target
- vision_msgs/Detection2DArray: Close but doesn't include our custom fields

**Rationale:** Clean contract with proper fields (person_id, confidence, is_target, body_bbox, face_bbox, face_visible). Breaking change is acceptable since we're replacing the entire tracking system.

### D6: Servo Control — Pan only, coordinated with wheels

**Choice:** Remove tilt servo support, implement pan + wheel coordination

**Control strategy:**
```
if |servo_angle| < 30°:
    servo handles fine adjustment (fast PID, ~50Hz)
    wheels don't rotate
else:
    wheels rotate to recenter (slow PID, ~10Hz)
    servo returns toward center
```

**Rationale:** Tilt rarely needed (people don't fly). Pan servo provides fast horizontal tracking. Wheels handle large movements. Coordination prevents oscillation.

### D7: Search Behavior — Progressive escalation

**Choice:** When target lost:
1. Continue last direction (0.5s)
2. Servo scan left-right (2s)
3. Rotate robot 360° slowly (5s)
4. Idle and wait

**Rationale:** Progressive escalation avoids unnecessary movement. Most "lost" cases recover in steps 1-2.

## Risks / Trade-offs

### R1: Base64 encoding overhead for webcam stream
**Risk:** Higher CPU usage and latency compared to native video streaming
**Mitigation:** Only used for enrollment (not real-time tracking). 10fps @ 640x480 JPEG is ~200KB/s, manageable over WebSocket.

### R2: Model download size (~500MB for InsightFace)
**Risk:** Slow first container start, large image size
**Mitigation:** Pre-download models in Dockerfile. Accept larger image size for faster runtime startup.

### R3: Breaking changes to existing tracking system
**Risk:** face_tracking.launch.py users need to migrate
**Mitigation:** Clear documentation. New launch file named person_tracking.launch.py makes the change obvious.

### R4: Single-threaded Python GIL for detection
**Risk:** YOLOv8 + InsightFace both CPU-bound, may bottleneck
**Mitigation:** Run detection at 10fps (matching camera). Use separate nodes (enrollment vs tracking) so they don't compete. Future: could use multiprocessing if needed.

### R5: SQLite file location
**Risk:** DB location not standardized, could be lost on container rebuild
**Mitigation:** Store at `~/.slam_car/face_db.sqlite` (persists in home directory). Document backup procedure.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────────┘

    ENROLLMENT                                  TRACKING
    ══════════                                  ════════

    ┌────────────┐                              ┌────────────┐
    │  Laptop    │                              │ ESP32-CAM  │
    │  Webcam    │                              │            │
    └─────┬──────┘                              └─────┬──────┘
          │ getUserMedia                              │ MJPEG
          │ + base64                                  │ HTTP
          ▼                                           ▼
    ┌────────────┐                              ┌────────────┐
    │ Next.js    │                              │ cam_bridge │
    │ App        │                              │ _node      │
    └─────┬──────┘                              └─────┬──────┘
          │ rosbridge WS                              │
          │ /enrollment/image                         │ /camera/image_raw
          ▼                                           ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                      enrollment_node                             │
    │  • YOLOv8n (face detection for enrollment)                      │
    │  • InsightFace (embedding extraction)                           │
    │  • SQLite DB management                                         │
    │  Services: /enrollment/{add,remove,list,set_target,get_target}  │
    │  Topics: /enrollment/status (EnrollmentStatus)                  │
    └───────────────────────────────┬─────────────────────────────────┘
                                    │ loads embeddings
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    person_tracker_node                           │
    │  • YOLOv8n (body detection)                                     │
    │  • InsightFace (face recognition)                               │
    │  • Matches faces against enrolled embeddings                    │
    │  Publishes: /tracked_persons (TrackedPersonArray)               │
    └───────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                  tracking_controller_node                        │
    │  • Servo PID (fast, fine adjustment)                            │
    │  • Wheel PID (slow, coarse adjustment)                          │
    │  • Search behavior state machine                                │
    │  Publishes: /cmd_vel, /servo_cmd                                │
    └───────────────────────────────┬─────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      ▼                           ▼
               ┌───────────┐               ┌───────────┐
               │  Servo    │               │  Motors   │
               │  (pan)    │               │  (diff)   │
               └───────────┘               └───────────┘
```

## File Changes Summary

| Area | Files | Action |
|------|-------|--------|
| Interfaces | msg/*.msg, srv/*.srv | Add 5 msgs, 5 srvs |
| Nodes | slam_car_perception/*.py | Remove 2, add 3 |
| Launch | face_tracking.launch.py | Replace with person_tracking.launch.py |
| Config | face_tracker.yaml | Replace with person_tracker.yaml |
| Firmware | servos.cpp, ros_bridge.cpp, config.h | Remove tilt |
| URDF | slam_car.urdf.xacro | Remove camera_tilt_joint |
| Docker | Dockerfile | Add deps, pre-download models |
| App | src/app/enrollment/*, src/components/* | Add enrollment UI |
