# MODIFIED Requirements

## Requirement: Servo pan and tilt are controlled via /servo_cmd

The firmware SHALL subscribe to `/servo_cmd` (`sensor_msgs/JointState`), successfully deserialize incoming commands for supported joints, and set servo positions for joints named `"camera_pan_joint"` and `"camera_tilt_joint"`. Angle values in the `position` array SHALL be in radians. The firmware SHALL convert radians to degrees and clamp to the servo's physical range. Subscriber-side message buffers SHALL be pre-allocated so deserialization reaches the servo callback for supported commands.

### Scenario: Pan servo receives command

- **WHEN** a JointState message arrives on `/servo_cmd` with `name=["camera_pan_joint"]` and `position=[0.0]` (0 radians = center)
- **THEN** the message SHALL deserialize successfully
- **AND** Servo 1 (GPIO 18) moves to 90 degrees (center position)

### Scenario: Tilt servo receives command

- **WHEN** a JointState message arrives on `/servo_cmd` with `name=["camera_tilt_joint"]` and `position=[-0.52]` (~-30 degrees looking down)
- **THEN** the message SHALL deserialize successfully
- **AND** Servo 2 (GPIO 19) moves to 60 degrees

### Scenario: Out-of-range angles are clamped

- **WHEN** a servo command requests an angle beyond physical limits after the message is deserialized
- **THEN** the angle is clamped to 0-180 degrees and the servo moves to the clamped position
