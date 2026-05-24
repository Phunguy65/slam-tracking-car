# Why

The ESP32 firmware subscribes to `/servo_cmd`, but incoming `sensor_msgs/JointState` commands for `camera_pan_joint` can fail to deserialize because the subscriber message buffer does not pre-allocate storage for string content or all sequence fields. This leaves the pan servo stuck at its centered startup position even though the UI publishes valid commands, so the bug should be fixed now to restore live camera pan control.

## What Changes

- Pre-allocate storage for the `/servo_cmd` JointState subscriber name entry so micro-XRCE-DDS can deserialize `camera_pan_joint` into the firmware message buffer.
- Pre-allocate the `velocity` and `effort` sequences on the `/servo_cmd` subscriber message to match the JointState schema and avoid partially initialized incoming message storage.
- Preserve the existing servo callback behavior, UI command flow, LEDC configuration, and LiDAR behavior while fixing subscriber-side deserialization reliability.
- Verify the firmware still builds for `esp32_main` and that runtime logging shows non-zero servo pan command values after flashing.

## Capabilities

### New Capabilities

- `servo-cmd-deserialization`: Ensure firmware can deserialize incoming `/servo_cmd` JointState messages with pre-allocated string and numeric sequence storage.

### Modified Capabilities

- `servo-pan-tilt`: Update the `/servo_cmd` requirement so the firmware must successfully deserialize and process incoming JointState commands for supported joints.

## Impact

- Affected code: `/home/PNguyen/Workspace/MyProject/slam-tracking-car/firmware/src/ros_bridge.cpp`
- Affected systems: ESP32 micro-ROS subscriber setup for `/servo_cmd`, camera pan actuation, firmware runtime diagnostics
- Verification path: `pio run -e esp32_main` build and serial monitoring after flashing
