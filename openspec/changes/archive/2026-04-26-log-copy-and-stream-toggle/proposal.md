# Why

The dashboard currently makes ROS log excerpts cumbersome to reuse because operators must manually copy selected text, and the ESP32-CAM stream always remains active even when the user does not need video. These gaps slow debugging workflows and waste camera processing bandwidth during dashboard sessions.

## What Changes

- Add automatic clipboard copy behavior to the ROS log monitor so selected log text is copied on mouse release without requiring keyboard shortcuts.
- Add a dashboard-level camera stream enable toggle in the picture-in-picture header with matching application state and ROS topic publishing.
- Add camera stream enable handling in the ESP32-CAM firmware so the device can stop frame capture and resume it based on `/cam/stream_enable` messages while keeping the ROS connection alive.
- Update the camera stream UI to render an explicit disabled placeholder when streaming is turned off.

## Capabilities

### New Capabilities

- `ros-log-selection-copy`: Automatically copy selected ROS log text from the dashboard log monitor after mouse selection completes.
- `camera-stream-toggle`: Enable operators to toggle the ESP32-CAM stream from the dashboard and propagate the state to firmware through ROS messaging.

### Modified Capabilities

- None.

## Impact

- Affected web app files under `/home/PNguyen/Workspace/MyProject/slam-tracking-car/app/src/components` and `/home/PNguyen/Workspace/MyProject/slam-tracking-car/app/src/stores`.
- Affected firmware camera streaming logic in `/home/PNguyen/Workspace/MyProject/slam-tracking-car/firmware/src/cam_main.cpp`.
- Introduces use of `std_msgs/msg/Bool` on `/cam/stream_enable` between the web dashboard and ESP32-CAM firmware.
- Changes dashboard UX for log selection and camera control without adding new user-visible notifications or external dependencies.
