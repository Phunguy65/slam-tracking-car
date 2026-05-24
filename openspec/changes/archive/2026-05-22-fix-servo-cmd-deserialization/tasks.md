# Tasks

## 1. Update servo command subscriber buffer allocation

- [x] 1.1 Add static storage for `/servo_cmd` JointState `velocity` and `effort` arrays in `firmware/src/ros_bridge.cpp`
- [x] 1.2 Initialize the `/servo_cmd` name entry with writable string storage during `setup_messages()` so `camera_pan_joint` can deserialize into the subscriber buffer
- [x] 1.3 Complete `setup_messages()` pre-allocation for `name`, `position`, `velocity`, and `effort` without changing servo callback behavior or unrelated firmware paths ← (verify: `servo_cmd_msg` has valid sequence capacities and a non-null writable string buffer after setup, and only `firmware/src/ros_bridge.cpp` subscriber allocation logic changed)

## 2. Validate build and runtime behavior

- [ ] 2.1 Build the firmware with `pio run -e esp32_main` from the workspace root and resolve any compilation issues from the new JointState buffer setup
- [ ] 2.2 Flash the main board and drag the dashboard pan slider to confirm serial logs show `[servo_cmd] pan=XX.XX rad` with non-zero values when commands are sent ← (verify: build succeeds, servo callback logs appear after flashing, and pan commands no longer stall at center)
