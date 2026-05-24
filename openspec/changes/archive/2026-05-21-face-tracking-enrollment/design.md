## Context

The current face tracking system uses MediaPipe/OpenCV for face detection and publishes face positions on `/face_detections` (PoseArray). A separate controller subscribes and generates `/cmd_vel` commands. This works for basic demos but has critical limitations:
- Cannot distinguish between people (follows any face)
- Loses tracking when face is not visible (person turns away)
- No way to specify who to follow
- Distance to target is approximated by bounding-box width (proxy in pixels), not measured in meters

The new system introduces person enrollment (learn faces), body-based tracking (robust even when face not visible), and LiDAR–camera fusion (real metric range from `/scan`).

**Current state:**
- `face_tracker_node.py`: MediaPipe face detection → `/face_detections` (PoseArray) — to be replaced
- `face_follow_controller.py`: PID control → `/cmd_vel` (wheels only) — to be replaced
- ESP32-CAM streams MJPEG via HTTP, consumed by `cam_bridge_node.py` (publishes `/camera/image_raw` only — no `/camera_info`)
- Servo pan exists in firmware, accepts `/servo_cmd` (JointState) — tilt has been removed
- LiDAR LDS02RR publishes `/scan` (5 Hz, 360°) from `laser_link` (fixed on top of chassis)
- TF tree: `base_link → laser_link` (fixed) and `base_link → pan_link → camera_link → camera_optical_frame` (pan revolute, ±90°)
- Next.js app at `app/` has tracking page with camera view and PID tuner; enrollment UI scaffolding already merged

**Constraints:**
- Detection/recognition runs on laptop (no GPU on robot)
- ESP32-CAM resolution: 640×480 @ ~10 fps over WiFi MJPEG
- LiDAR sits ~7 cm above floor — sees feet/legs, not torso/face
- Latency budget: <200 ms end-to-end for responsive tracking
- SQLite for simplicity (single-user, no concurrent writes needed)
- Camera intrinsic K is not calibrated; only datasheet FOV (~62° horizontal) is available

## Goals / Non-Goals

**Goals:**
- Enable enrollment of specific people via laptop webcam with visual feedback (scan effect)
- Track enrolled persons robustly using body detection (even when face not visible)
- Re-identify persons by face embedding when face becomes visible
- Coordinate servo pan + wheel movement for smooth tracking
- Provide search behavior when target is lost
- Measure target distance in meters via LiDAR–camera fusion (replacing bbox-width proxy)
- Provide an obstacle-aware controller that halts forward motion when an object is closer than 30 cm in the front arc

**Non-Goals:**
- Multi-person tracking (follow multiple people simultaneously)
- Re-enrollment / updating existing person's embedding
- GPU acceleration (CPU-only for portability)
- Full WCAG accessibility (basic a11y only)
- Automated test coverage
- Tight EKF fusion (over-engineered for this scope)
- Camera calibration via checkerboard (datasheet FOV is enough)
- Tilt servo (removed — pan-only by design)

## Decisions

### D1: Face Embedding Model — InsightFace (buffalo_l)

**Choice:** InsightFace with `buffalo_l` model

**Alternatives considered:**
- FaceNet (128D): Good accuracy but requires PyTorch, less maintained
- dlib face_recognition: Easy but lower accuracy (99.38% vs 99.86%)
- ArcFace: Similar to InsightFace but requires mxnet

**Rationale:** InsightFace provides SOTA accuracy (99.86% on LFW), uses ONNX runtime (fast CPU inference), and includes detection + alignment + embedding in one package. `buffalo_l` balances accuracy and speed.

### D2: Body Detection Model — YOLOv8n

**Choice:** YOLOv8 nano variant

**Alternatives considered:**
- MediaPipe Pose: Lighter but limited multi-person support, outputs keypoints not bboxes
- YOLOv8s: More accurate but 2× slower (~60 ms vs ~30 ms)
- YOLOv5: Older, less maintained

**Rationale:** YOLOv8n achieves ~30 fps on CPU with acceptable accuracy (37.3 mAP). Clean bbox output integrates easily. The "person" class is reliable.

### D3: Webcam Stream — getUserMedia + base64 via rosbridge

**Choice:** Browser captures frames, encodes as base64 JPEG, publishes via existing roslib WebSocket

**Alternatives considered:**
- True WebRTC with aiortc: Lower latency but requires signaling server, new ROS2 node, complex setup
- HTTP POST to API route: Extra server, doesn't fit ROS2 architecture

**Rationale:** Reuses existing rosbridge infrastructure. ~10 fps is sufficient for enrollment (not real-time tracking). Implementation is ~20 lines using existing `usePublisher` hook. Tradeoff: higher latency than WebRTC, acceptable for enrollment.

### D4: Enrollment Data Path — ROS2 Services

**Choice:** All DB operations via ROS2 services (`AddPerson.srv`, `RemovePerson.srv`, etc.)

**Alternatives considered:**
- Next.js API routes: Standard web pattern but creates two processes accessing DB, needs WAL mode, state-sync complexity

**Rationale:** Single process (`enrollment_node`) owns the SQLite database. No concurrent-write issues. Fits ROS2 service-oriented architecture. Existing `useService` hook in app makes this straightforward.

### D5: Topic Contract — New TrackedPersonArray message

**Choice:** Create custom `TrackedPersonArray.msg`, remove old `PoseArray` hack

**Alternatives considered:**
- Reuse `PoseArray`: Quick but hacky (`position.z = width` is confusing), no fields for `person_id`, `confidence`, `is_target`
- `vision_msgs/Detection2DArray`: Close but doesn't include our custom fields

**Rationale:** Clean contract with proper fields (`person_id`, `confidence`, `is_target`, `body_bbox`, `face_bbox`, `face_visible`, plus the new `range_m` and `bearing_rad` from D8). Breaking change is acceptable since we're replacing the entire tracking system.

### D6: Servo Control — Pan only, coordinated with wheels

**Choice:** Remove tilt servo support, implement pan + wheel coordination

**Control strategy:**
```
if |servo_angle| < 30°:
    servo handles fine adjustment (fast PID, ~50 Hz)
    wheels don't rotate
else:
    wheels rotate to recenter (slow PID, ~10 Hz)
    servo returns toward center
```

**Rationale:** Tilt rarely needed (people don't fly). Pan servo provides fast horizontal tracking. Wheels handle large movements. Coordination prevents oscillation.

### D7: Search Behavior — Progressive escalation

**Choice:** When target lost:
1. Continue last direction (0.5 s)
2. Servo scan left-right (2 s)
3. Rotate robot 360° slowly (5 s)
4. Idle and wait

**Rationale:** Progressive escalation avoids unnecessary movement. Most "lost" cases recover in steps 1–2.

### D8: LiDAR–Camera Fusion — Leg clusters + bearing association

**Choice:** Detect leg-pair clusters in `/scan`, compute body-bbox bearing in `laser_link`, associate by angular tolerance.

**Pipeline:**
1. **Leg clusterer** on each `/scan`: group consecutive points whose range delta is small (<0.05 m). Keep clusters whose width is 5–30 cm and centroid range is 0.3–3.0 m. Pair two clusters whose centroid gap is 15–35 cm — those are a person's legs.
2. **Bearing transform**: for each YOLO body bbox, compute the camera-frame bearing `θ_cam = atan((u − cx) / fx)` from the bbox center pixel. Use `tf2_ros.Buffer` + `TransformListener` to transform the unit vector `(sin θ_cam, 0, cos θ_cam)` from `camera_optical_frame` into `laser_link` (this folds in the live `pan_link` joint angle from `/joint_states` automatically). Convert the resulting vector back to a 2D bearing in the LiDAR plane.
3. **Association**: pick the leg-pair whose centroid bearing is within `bearing_match_tolerance_rad` (default 0.10 rad ≈ 5.7°) of the body bbox bearing. The leg-pair centroid range becomes the `range_m`.
4. **Fallback**: if no leg-pair is found within tolerance, set `range_m = NaN` and log a rate-limited warning (≤1/s). The controller treats `NaN` as "no metric range" and falls back to bearing-only tracking with linear=0.

**Alternatives considered:**
- **Bearing-only + scan lookup** (`ranges[index_of_bearing]`): one line of code, but fails badly when an obstacle is between robot and target — the lookup returns the obstacle's range, not the person's.
- **Camera-only (bbox-width proxy)**: keeps the legacy approach. Avoids LiDAR fusion but cannot give metric distance, so the "stop at 1 m" requirement is impossible to meet without per-person tuning.
- **Tight EKF fusion (4-state [x, y, vx, vy])**: smoothest output, but heavy to implement and tune, and overkill for the project's scope.

**Rationale:** Camera (mono) gives reliable bearing and identity but no metric depth. LiDAR (fixed top, 7 cm) gives metric range but no identity. Associating leg-pair clusters with body bboxes by bearing is the cheapest way to get both. `tf2_ros` handles the live pan-servo angle automatically — no manual sign-flipping. NaN propagation keeps the system safe when fusion fails.

### D9: Range-Based Linear Control

**Choice:** Replace bbox-width proxy with metric range from D8.

**Config (in `person_tracker.yaml`):**
- `target_distance_min: 1.0` m, `target_distance_max: 1.5` m — deadband (no linear command)
- `distance_too_far: 2.5` m — go forward at `max_linear_speed`
- `distance_too_close: 0.6` m — go backward at `max_linear_speed`
- Linear PID input is `range_m − target_distance_center` where `target_distance_center = (target_distance_min + target_distance_max) / 2`

**Removed config:** `target_body_width_min`, `target_body_width_max`, `body_width_too_far`, `body_width_too_close`.

**Rationale:** Bounding-box width depends on focal length, image resolution, and the person's stature — values that change between people and between camera frames. Real metric range is generalisable, easier to tune, and matches how humans describe "follow at 1.2 m".

### D10: /camera_info Publishing

**Choice:** `cam_bridge_node` publishes `sensor_msgs/CameraInfo` on `/camera_info`, with the same stamp as each `/camera/image_raw` message and `frame_id = camera_optical_frame`. Intrinsic `K` is hard-coded from the datasheet.

**Computation (per-frame, but values are constant for a given resolution):**
- `cx = w / 2`, `cy = h / 2`
- `fx = fy = w / (2 · tan(FOV_h / 2))` where `FOV_h = camera_fov_horizontal_deg` (default 62°)
- `K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]]`
- `D = [0, 0, 0, 0, 0]` (no distortion)
- `P = [[fx, 0, cx, 0], [0, fy, cy, 0], [0, 0, 1, 0]]`
- `R = identity(3)`

**Alternatives considered:**
- **Hard-code FOV inside `person_tracker_node`** (no `/camera_info` publishing): saves one publisher but breaks ROS2 conventions and forces every consumer to know the FOV constant.
- **Real calibration (camera_calibration package + checkerboard)**: most accurate, but requires a calibration target and a custom service node. Overkill for tracking accuracy needs.

**Rationale:** Publishing `/camera_info` is the standard ROS2 contract for image streams. Any future consumer (rectification, projection, depth fusion) can read `K` directly. Datasheet FOV is accurate enough — at 640×480 the bearing error from a 1° FOV mismatch is ~0.6 px·°, well below the `bearing_match_tolerance_rad` of 5.7°.

### D11: Front-Arc Safety in Tracking Mode

**Choice:** `tracking_controller_node` subscribes `/scan`. A helper `front_arc_clear(min_dist=0.3, half_arc_rad=0.35)` checks the minimum range across the front ±0.35 rad (~±20°) arc. When that minimum is below `front_safety_distance` (0.3 m), `linear.x` is forced to 0. Servo pan and wheel-yaw control continue normally so the camera keeps the target framed. Status payload includes `obstacle: true`.

**Rationale:** Nav2 is not running in tracking mode, so the controller's own safety check is the only obstacle defense. Halting only the linear axis (not yaw, not pan) avoids the "robot stops dead" UX failure: the robot keeps facing the target, which makes intent visible to a bystander. The `obstacle` flag in status lets the dashboard render a red banner.

## Risks / Trade-offs

### R1: Base64 encoding overhead for webcam stream
**Risk:** Higher CPU usage and latency compared to native video streaming.
**Mitigation:** Only used for enrollment (not real-time tracking). 10 fps @ 640×480 JPEG is ~200 KB/s, manageable over WebSocket.

### R2: Model download size (~500 MB for InsightFace)
**Risk:** Slow first container start, large image size.
**Mitigation:** Pre-download models in Dockerfile. Accept larger image size for faster runtime startup.

### R3: Breaking changes to existing tracking system
**Risk:** `face_tracking.launch.py` users need to migrate.
**Mitigation:** Clear documentation. New launch file `person_tracking.launch.py` makes the change obvious.

### R4: Single-threaded Python GIL for detection
**Risk:** YOLOv8 + InsightFace both CPU-bound, may bottleneck.
**Mitigation:** Run detection at 10 fps (matching camera). Use separate nodes (enrollment vs tracking) so they don't compete. Future: could use multiprocessing if needed.

### R5: SQLite file location
**Risk:** DB location not standardised, could be lost on container rebuild.
**Mitigation:** Store at `~/.slam_car/face_db.sqlite` (persists in home directory). Document backup procedure.

### R6: LiDAR–camera time skew
**Risk:** Scan (5 Hz) and image (10 Hz) timestamps differ by up to 100 ms; during fast rotation the bearing in the camera frame and the bearing in the LiDAR frame disagree.
**Mitigation:** `tf2_ros.Buffer.lookup_transform` uses the image timestamp; if the transform is unavailable for that exact time, fall back to the latest available. Bearing tolerance of 0.10 rad covers small skew. For aggressive rotations (>1 rad/s) the controller relies on bearing-only mode (range NaN).

### R7: Leg clusterer false positives
**Risk:** Table legs, chair legs, narrow obstacles may look like "person legs" in `/scan`.
**Mitigation:** Association requires the leg-pair to lie within 0.10 rad of a YOLO body bbox bearing — chairs without people don't generate false ranges. When in doubt (no body bbox), no leg-pair output is consumed.

### R8: Datasheet FOV ≠ true FOV
**Risk:** ESP32-CAM modules vary; the assumed 62° may be off by a few degrees.
**Mitigation:** `camera_fov_horizontal_deg` is a parameter — operators can override at launch. Future calibration via checkerboard remains an option (not in scope here).

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                                 │
└──────────────────────────────────────────────────────────────────────────────────┘

    ENROLLMENT                                  TRACKING
    ══════════                                  ════════

    ┌────────────┐                              ┌────────────┐         ┌──────────┐
    │  Laptop    │                              │ ESP32-CAM  │         │  ESP32   │
    │  Webcam    │                              │  (pan ±90°)│         │  Main    │
    └─────┬──────┘                              └─────┬──────┘         └────┬─────┘
          │ getUserMedia + base64                     │ MJPEG               │
          ▼                                           ▼                     │
    ┌────────────┐                              ┌────────────────┐          │
    │ Next.js    │                              │ cam_bridge_node │         │
    │ App        │                              │  • /camera/    │          │
    └─────┬──────┘                              │    image_raw   │          │
          │ rosbridge WS                        │  • /camera_info│          │
          │ /enrollment/image                   │    (K from FOV)│          │
          ▼                                     └────────┬───────┘          │
    ┌─────────────────────────────────────────────────────────────────┐    │
    │                      enrollment_node                             │    │
    │  • YOLOv8n (face detection for enrollment)                       │    │
    │  • InsightFace (embedding extraction)                            │    │
    │  • SQLite DB management                                          │    │
    │  Services: /enrollment/{add,remove,list,set_target,get_target}   │    │
    │  Topics:   /enrollment/status (EnrollmentStatus)                 │    │
    └────────────────────────────┬────────────────────────────────────┘    │
                                 │ loads embeddings                         │
                                 ▼                                          │
    ┌─────────────────────────────────────────────────────────────────┐    │
    │                    person_tracker_node                          │    │
    │                                                                 │    │
    │  Subs: /camera/image_raw, /camera_info,                         │◄───┤  /scan
    │        /scan, /joint_states (pan angle)                         │◄───┤  /joint_states
    │                                                                 │    │
    │  • YOLOv8n (body detection)        ┌──────────────────────┐    │    │
    │  • InsightFace (face recognition)  │  leg_clusterer       │    │    │
    │  • IOU tracker (identity persist)  │  (5–30cm wide,       │    │    │
    │  • SQLite hot-reload (1 Hz)        │   pair gap 15–35cm)  │    │    │
    │                                    └──────────┬───────────┘    │    │
    │                                               │                │    │
    │  ┌────────────────────────────┐  ┌───────────▼────────────┐    │    │
    │  │ bearing_transform (tf2_ros)│─►│ associate_bbox_to_legs │    │    │
    │  │  pixel → bearing in        │  │  bearing_tol = 0.10 rad│    │    │
    │  │  laser_link (uses live pan)│  │  fallback: range=NaN   │    │    │
    │  └────────────────────────────┘  └────────────┬───────────┘    │    │
    │                                               │                │    │
    │  Pub: /tracked_persons (TrackedPersonArray)   │                │    │
    │       — adds range_m + bearing_rad ◄──────────┘                │    │
    └────────────────────────────┬────────────────────────────────────┘    │
                                 │                                          │
                                 ▼                                          │
    ┌─────────────────────────────────────────────────────────────────┐    │
    │                  tracking_controller_node                        │    │
    │  Subs: /tracked_persons, /scan ◄────────────────────────────────┼────┘
    │                                                                  │
    │  • Servo PID 50 Hz   ← bearing                                   │
    │  • Wheel yaw PID 10 Hz   ← |servo|>30°                           │
    │  • Linear PID    ← (range_m − target_distance_center)            │
    │  • front_arc_clear(0.3 m, ±0.35 rad)                             │
    │      false → linear=0, obstacle=true (still pan + yaw)           │
    │  • Search FSM (continue→scan→spin→idle)                          │
    │                                                                  │
    │  Pubs: /cmd_vel, /servo_cmd                                      │
    │        /tracking_controller/status (5 Hz, JSON):                 │
    │           {state, target_id, range_m, obstacle}                  │
    └────────────────────────────┬────────────────────────────────────┘
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
| Interfaces | `msg/*.msg`, `srv/*.srv` | Add 5 msgs, 5 srvs (TrackedPerson includes `range_m`, `bearing_rad`) |
| Camera bridge | `cam_bridge_node.py` | Add `/camera_info` publisher with K from FOV |
| Tracker node | `person_tracker_node.py` | Subs `/scan`, `/joint_states`, `/camera_info`; new `leg_clusterer.py`, `bearing_transform.py`, association logic |
| Controller node | `tracking_controller_node.py` | Range-based linear PID; front-arc safety; status JSON |
| Enrollment node | `enrollment_node.py` | Restored unchanged from prior implementation |
| Launch | `person_tracking.launch.py` | Replaces `face_tracking.launch.py` |
| Config | `person_tracker.yaml` | Replace bbox-width fields with distance/safety/leg/FOV fields |
| Firmware | `servos.cpp`, `ros_bridge.cpp`, `config.h` | Already pan-only (D6 done in firmware-modularization) |
| URDF | `slam_car.urdf.xacro` | Already pan-only |
| Docker | `Dockerfile` | Add `ultralytics`, `insightface`, `onnxruntime`, pre-download model weights |
| App | `src/app/enrollment/*`, `src/components/*` | Already merged in dashboard commit |
