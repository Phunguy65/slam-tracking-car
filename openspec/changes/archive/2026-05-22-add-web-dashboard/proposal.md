# Why

The robot currently lacks a web-based control interface. Operators must use RViz2 or command-line tools to control the robot, which requires ROS2 knowledge and desktop access. A web dashboard enables remote operation from any device (desktop/tablet) with a browser, supporting both face tracking and SLAM/navigation modes through an intuitive UI.

## What Changes

- Add **rosbridge_suite** for WebSocket communication between web app and ROS2
- Add **m-explore-ros2** (frontier exploration) built from source for autonomous mapping
- Add **image_transport republisher** for compressed camera streaming
- Modify **face_follow_controller** to support live PID parameter tuning via callbacks
- Create new **dashboard.launch.py** to launch rosbridge and supporting nodes
- Build **Next.js web dashboard** with:
  - Tracking mode: camera stream, face overlay, start/stop, PID tuner
  - SLAM mapping mode: live map, LiDAR radar, manual joystick, auto-explore, save/load maps
  - SLAM navigation mode: map display, initial pose setter, click-to-navigate
  - Global: mode switcher, connection status, emergency stop

## Capabilities

### New Capabilities

- `web-dashboard-tracking`: Web UI for face tracking mode — camera stream with face detection overlay, tracking controls, live PID parameter tuning
- `web-dashboard-slam`: Web UI for SLAM operations — live occupancy grid map, LiDAR radar visualization, manual joystick control, frontier exploration toggle, map save/load
- `web-dashboard-navigation`: Web UI for autonomous navigation — saved map display, initial pose setting, click-to-set-goal navigation
- `rosbridge-integration`: WebSocket bridge between web frontend and ROS2 — topic pub/sub, service calls, action clients
- `frontier-exploration`: Autonomous frontier-based exploration for SLAM mapping using m-explore-ros2

### Modified Capabilities

- `servo-pan-tilt`: face_follow_controller needs parameter callback for live PID tuning from web UI

## Impact

**New Dependencies:**
- `ros-humble-rosbridge-suite` (apt)
- `ros-humble-image-transport-plugins` (apt)
- `m-explore-ros2` (build from source)
- `roslibjs` (npm)
- `shadcn/ui` components (npm)

**Modified Files:**
- `.devcontainer/Dockerfile` — add ROS packages and m-explore build
- `src/slam_car_perception/slam_car_perception/face_follow_controller.py` — add parameter callback
- `src/slam_car_bringup/launch/` — new dashboard.launch.py
- `app/` — complete frontend implementation

**APIs:**
- WebSocket: `ws://localhost:9090` (rosbridge)
- Topics: `/camera/image_raw/compressed`, `/map`, `/scan`, `/tf`, `/cmd_vel`, `/face_detections`, `/initialpose`
- Services: `/slam_toolbox/save_map`, `/set_mode`, `*/set_parameters`
- Actions: `/navigate_to_pose`, `/explore/explore`
