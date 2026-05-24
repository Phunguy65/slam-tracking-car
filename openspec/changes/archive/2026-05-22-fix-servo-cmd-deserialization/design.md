# Context

The firmware already declares a `/servo_cmd` subscriber using `sensor_msgs/JointState`, and the servo callback correctly filters incoming joint names and applies pan commands. The failure occurs before the callback runs: `setup_messages()` prepares the incoming `servo_cmd_msg` with storage for the `name` sequence container and the `position` array, but it leaves each `rosidl_runtime_c__String` entry unbacked and omits `velocity` and `effort` storage even though those sequences are part of the JointState message layout.

Because micro-ROS on the ESP32 relies on pre-allocated message memory for deserialization, an incoming `camera_pan_joint` string cannot be copied into a `NULL` string buffer. That makes `/servo_cmd` appear idle even when the dashboard publishes valid commands. The fix must stay limited to subscriber message allocation in `firmware/src/ros_bridge.cpp` and must not change UI behavior, servo callback semantics, LiDAR code, or LEDC configuration.

## Goals / Non-Goals

**Goals:**

- Ensure the `/servo_cmd` JointState subscriber can deserialize supported commands without silent string-buffer failures.
- Pre-allocate all subscriber-side JointState fields needed for reliable deserialization in the current firmware flow.
- Keep the existing callback, joint naming contract, and actuation behavior intact.
- Preserve compatibility with the current `esp32_main` PlatformIO build and serial-log based runtime verification.

**Non-Goals:**

- Redesign the servo control topic, message type, or callback logic.
- Change LEDC timer or channel assignments.
- Modify LiDAR startup behavior, PID tuning, or dashboard slider behavior.
- Add new runtime protocols, dynamic allocation strategies, or broader ROS bridge refactors.

## Decisions

### Decision: Pre-allocate one concrete string buffer for the single supported subscriber joint entry

`servo_cmd_msg.name` already uses a fixed-capacity sequence of length one, so the design will back `servo_cmd_names_data[0]` with writable string storage during `setup_messages()`. The preferred implementation is to call `rosidl_runtime_c__String__assign()` with the supported joint name so the runtime allocates and tracks a valid buffer with correct size and capacity metadata.

This approach is favored over manually setting `.data`, `.size`, and `.capacity` because the helper keeps the `rosidl_runtime_c__String` struct internally consistent and matches how other string fields in the file are initialized. A manual static char buffer remains a fallback if allocation helper constraints appear on target, but it is not the primary plan.

### Decision: Pre-allocate all JointState numeric sequences used by the subscriber

The design will add static storage for `servo_cmd_msg.velocity` and `servo_cmd_msg.effort` alongside the existing `position` storage, each with capacity one to match the single-joint subscriber contract. Even if the current callback only reads `name` and `position`, the incoming message type contains these arrays and leaving them unset creates a partially initialized deserialization target.

This is chosen over ignoring unused fields because the root cause already demonstrates that incomplete message pre-allocation can break delivery before business logic runs. Fully preparing the subscriber-side message layout is the safest way to align with micro-ROS deserialization expectations.

### Decision: Keep the fix local to `setup_messages()` and existing static storage declarations

The implementation will be limited to the existing message pre-allocation path and nearby static storage definitions in `firmware/src/ros_bridge.cpp`. No changes are needed in the subscriber registration, executor wiring, or servo callback.

This is preferred over introducing helper abstractions or broader ROS bridge restructuring because the defect is narrow, the root cause is known, and the requested fix should minimize regression risk in unrelated firmware paths.

## Risks / Trade-offs

- [Dynamic string assignment may allocate heap memory on the ESP32] → Mitigation: only one subscriber string is assigned during setup/reconnect, and the scope remains bounded; if heap behavior becomes problematic, the implementation can swap to a fixed static char buffer without changing the spec intent.
- [Single-entry pre-allocation constrains the subscriber to one commanded joint per message] → Mitigation: this matches the current firmware contract and UI usage for pan control, and the spec will make this explicit rather than implying multi-joint support from the subscriber buffer.
- [Reconnect paths call `setup_messages()` repeatedly] → Mitigation: reuse the standard string assign helper or an equivalent idempotent initialization approach so repeated setup keeps a valid buffer across reconnections.

## Migration Plan

1. Update `firmware/src/ros_bridge.cpp` static storage and `setup_messages()` to allocate the missing JointState subscriber buffers.
2. Build the firmware with `pio run -e esp32_main` from the workspace root to confirm the change compiles cleanly.
3. Flash the main board using the existing workflow and exercise the dashboard pan slider.
4. Confirm serial output includes `[servo_cmd] pan=XX.XX rad` entries with non-zero values during slider movement.
5. If regressions appear, revert only the subscriber pre-allocation changes because the fix is isolated to `ros_bridge.cpp`.

## Open Questions

- None. The root cause, scope, and verification path are already defined.
