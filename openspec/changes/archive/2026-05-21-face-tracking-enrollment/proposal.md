# Why

The current face tracking system detects any face and follows it, but cannot distinguish between different people. For real-world use, the robot needs to:
1. Learn specific people (enrollment) so it can follow a designated target
2. Track people even when their face is temporarily not visible (using body detection)
3. Provide a user-friendly web interface for managing enrolled persons

## What Changes

- **New enrollment system**: Laptop webcam captures faces, extracts embeddings using InsightFace, stores in SQLite database
- **Person tracking replaces face tracking**: YOLOv8n body detection + InsightFace face recognition for robust tracking
- **New ROS2 interfaces**: Custom messages (TrackedPersonArray, EnrolledPerson, etc.) and services (AddPerson, RemovePerson, SetTrackingTarget, etc.)
- **Servo pan-only control**: Remove tilt servo support, implement servo + wheel coordination for smoother tracking
- **Web UI updates**: New enrollment page with scan effect, updated tracking page showing target info
- **BREAKING**: Remove existing face_tracker_node and face_follow_controller, replace with new person_tracker_node and tracking_controller_node
- **BREAKING**: Remove /face_detections topic (PoseArray), replace with /tracked_persons (TrackedPersonArray)

## Capabilities

### New Capabilities

- `person-enrollment`: Web UI for capturing faces via laptop webcam, extracting embeddings, and managing enrolled persons in SQLite database
- `person-tracking`: Body + face detection and recognition system that tracks enrolled persons by body bbox and re-identifies by face embedding
- `tracking-control`: Coordinated servo pan + wheel control with search behavior when target is lost

### Modified Capabilities

<!-- No existing specs to modify - this is a new system replacing the old one -->

## Impact

- **ROS2 Interfaces** (`slam_car_interfaces/`): Add 5 new message types, 5 new service types
- **ROS2 Nodes** (`slam_car_perception/`): Remove 2 nodes (face_tracker_node, face_follow_controller), add 3 nodes (enrollment_node, person_tracker_node, tracking_controller_node)
- **Launch Files** (`slam_car_bringup/`): Replace face_tracking.launch.py with person_tracking.launch.py
- **Firmware** (`firmware/`): Remove tilt servo code from servos.cpp, ros_bridge.cpp, config.h
- **URDF** (`slam_car_bringup/urdf/`): Remove camera_tilt_joint
- **Docker** (`.devcontainer/Dockerfile`): Add ultralytics, insightface, onnxruntime; pre-download model weights
- **Web App** (`app/`): Add enrollment page + components, update tracking page overlay
- **Dependencies**: ultralytics (YOLOv8), insightface, onnxruntime, sqlite3
