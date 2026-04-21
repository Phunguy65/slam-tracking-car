# Tasks

## 1. ROS2 Interfaces

- [x] 1.1 Create BoundingBox2D.msg in slam_car_interfaces/msg/
- [x] 1.2 Create TrackedPerson.msg in slam_car_interfaces/msg/
- [x] 1.3 Create TrackedPersonArray.msg in slam_car_interfaces/msg/
- [x] 1.4 Create EnrolledPerson.msg in slam_car_interfaces/msg/
- [x] 1.5 Create EnrollmentStatus.msg in slam_car_interfaces/msg/
- [x] 1.6 Create AddPerson.srv in slam_car_interfaces/srv/
- [x] 1.7 Create RemovePerson.srv in slam_car_interfaces/srv/
- [x] 1.8 Create ListPersons.srv in slam_car_interfaces/srv/
- [x] 1.9 Create SetTrackingTarget.srv in slam_car_interfaces/srv/
- [x] 1.10 Create GetTrackingTarget.srv in slam_car_interfaces/srv/
- [x] 1.11 Update CMakeLists.txt to build new messages and services
- [ ] 1.12 Build and verify interfaces compile: colcon build --packages-select slam_car_interfaces (requires ROS2 container)

## 2. Docker/Dependencies

- [x] 2.1 Add ultralytics, insightface, onnxruntime to Dockerfile pip install
- [x] 2.2 Add model pre-download commands to Dockerfile (YOLOv8n + InsightFace buffalo_l)
- [x] 2.3 Create ~/.slam_car directory in Dockerfile for face_db.sqlite
- [ ] 2.4 Rebuild container and verify dependencies installed (manual: podman build + distrobox)

## 3. Enrollment Node

- [x] 3.1 Create enrollment_node.py skeleton with ROS2 node setup
- [x] 3.2 Implement SQLite database initialization (create tables if not exist)
- [x] 3.3 Implement /enrollment/image subscriber (CompressedImage from webcam)
- [x] 3.4 Implement YOLOv8n face detection on incoming frames
- [x] 3.5 Implement InsightFace embedding extraction
- [x] 3.6 Implement EnrollmentStatus publisher with state machine (IDLE/FACE_DETECTED/SCANNING/READY/NO_FACE)
- [x] 3.7 Implement /enrollment/add_person service
- [x] 3.8 Implement /enrollment/remove_person service
- [x] 3.9 Implement /enrollment/list_persons service
- [x] 3.10 Implement /enrollment/set_target service
- [x] 3.11 Implement /enrollment/get_target service
- [x] 3.12 Add entry point to setup.py
- [ ] 3.13 Test enrollment_node standalone with mock webcam images (manual: requires container)

## 4. Person Tracker Node

- [x] 4.1 Create person_tracker_node.py skeleton with ROS2 node setup
- [x] 4.2 Implement /camera/image_raw subscriber
- [x] 4.3 Implement YOLOv8n body detection
- [x] 4.4 Implement InsightFace face detection within body bbox
- [x] 4.5 Implement face embedding extraction and matching against DB
- [x] 4.6 Implement embedding hot-reload when DB changes
- [x] 4.7 Implement TrackedPersonArray publisher on /tracked_persons
- [x] 4.8 Implement target marking logic (is_target field)
- [x] 4.9 Add entry point to setup.py
- [ ] 4.10 Test person_tracker_node with ESP32-CAM stream (manual: requires container)

## 5. Tracking Controller Node

- [x] 5.1 Create tracking_controller_node.py skeleton with ROS2 node setup
- [x] 5.2 Implement /tracked_persons subscriber
- [x] 5.3 Implement servo pan PID controller (50Hz loop)
- [x] 5.4 Implement wheel yaw PID controller (10Hz loop)
- [x] 5.5 Implement servo-wheel coordination logic (±30° threshold)
- [x] 5.6 Implement forward/backward control based on body_bbox size
- [x] 5.7 Implement search behavior state machine (CONTINUE/SCAN/ROTATE/IDLE)
- [x] 5.8 Implement /cmd_vel publisher (Twist)
- [x] 5.9 Implement /servo_cmd publisher (JointState)
- [x] 5.10 Implement configurable PID parameters via ROS2 params
- [x] 5.11 Add entry point to setup.py
- [ ] 5.12 Test tracking_controller_node with mock TrackedPersonArray (manual: requires container)

## 6. Remove Old Tracking System

- [x] 6.1 Remove face_tracker_node.py from slam_car_perception
- [x] 6.2 Remove face_follow_controller.py from slam_car_perception
- [x] 6.3 Update setup.py to remove old entry points
- [x] 6.4 Remove face_tracker.yaml config file

## 7. Launch File and Config

- [x] 7.1 Create person_tracker.yaml config file with PID defaults
- [x] 7.2 Create person_tracking.launch.py (enrollment_node + person_tracker_node + tracking_controller_node)
- [x] 7.3 Remove face_tracking.launch.py
- [ ] 7.4 Test full launch file with real hardware (manual: requires container + hardware)

## 8. Firmware Changes

- [x] 8.1 Remove servos_set_tilt() and servos_get_tilt() from servos.cpp
- [x] 8.2 Remove tilt servo declarations from servos.h
- [x] 8.3 Remove SERVO_TILT_PIN validation from config.h (keep define but no error)
- [x] 8.4 Remove camera_tilt_joint from joint_states_msg in ros_bridge.cpp
- [x] 8.5 Remove camera_tilt_joint handling from servo_cmd_callback in ros_bridge.cpp
- [x] 8.6 Update joint_positions_data array size from 2 to 1
- [ ] 8.7 Build firmware: pio run -e esp32_main (manual: requires container)
- [ ] 8.8 Flash and test servo pan control (manual: requires hardware)

## 9. URDF Changes

- [x] 9.1 Remove camera_tilt_joint from slam_car.urdf.xacro
- [x] 9.2 Update camera link to attach directly to pan joint output
- [ ] 9.3 Test with robot_state_publisher (no missing joint warnings) (manual: requires container)

## 10. Next.js Enrollment UI

- [x] 10.1 Create enrollment-store.ts with Zustand for enrollment state
- [x] 10.2 Create types/enrollment.ts with TypeScript types for messages
- [ ] 10.3 Update types/ros-messages.ts with new message types (skipped - types in separate file)
- [x] 10.4 Create use-enrollment.ts hook for service calls
- [x] 10.5 Create webcam-capture.tsx component (getUserMedia + canvas + base64 publish)
- [x] 10.6 Create scan-overlay.tsx component (scan line animation, corner brackets)
- [x] 10.7 Create face-status.tsx component (status display bar)
- [x] 10.8 Create enroll-form.tsx component (name input + submit button)
- [x] 10.9 Create person-card.tsx component (thumbnail, name, target badge, remove)
- [x] 10.10 Create person-list.tsx component (list of person cards)
- [x] 10.11 Create target-badge.tsx component (active target indicator)
- [x] 10.12 Create app/enrollment/page.tsx assembling all components
- [x] 10.13 Add enrollment link to navigation
- [ ] 10.14 Run bun run lint and fix any issues (manual: requires bun)

## 11. Next.js Tracking UI Updates

- [x] 11.1 Create person-overlay.tsx component (body bbox, face bbox, name label)
- [x] 11.2 Remove face-overlay.tsx component
- [x] 11.3 Update tracking/page.tsx to use person-overlay
- [x] 11.4 Update tracking-status.tsx to show target name, confidence, servo angle
- [ ] 11.5 Run bun run lint and fix any issues (manual: requires bun)

## 12. Integration Testing (manual: requires hardware)

- [ ] 12.1 Test full enrollment flow: webcam → detect → scan → add person
- [ ] 12.2 Test list/remove persons from enrollment UI
- [ ] 12.3 Test set tracking target from enrollment UI
- [ ] 12.4 Test tracking with ESP32-CAM: recognized person followed
- [ ] 12.5 Test tracking with unknown person: ignored when target is set
- [ ] 12.6 Test search behavior when target walks out of frame
- [ ] 12.7 Test servo-wheel coordination during tracking
- [ ] 12.8 Verify no regressions in SLAM/navigation modes
