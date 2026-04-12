# ADDED Requirements

## Requirement: Servo pan and tilt are controlled via /servo_cmd

The firmware SHALL subscribe to `/servo_cmd` (`sensor_msgs/JointState`) and set servo positions for joints named `"camera_pan_joint"` and `"camera_tilt_joint"`. Angle values in the `position` array SHALL be in radians. The firmware SHALL convert radians to degrees and clamp to the servo's physical range.

### Scenario: Pan servo receives command

- **WHEN** a JointState message arrives on `/servo_cmd` with `name=["camera_pan_joint"]` and `position=[0.0]` (0 radians = center)
- **THEN** Servo 1 (GPIO 18) moves to 90 degrees (center position)

### Scenario: Tilt servo receives command

- **WHEN** a JointState message arrives on `/servo_cmd` with `name=["camera_tilt_joint"]` and `position=[-0.52]` (~-30 degrees looking down)
- **THEN** Servo 2 (GPIO 19) moves to 60 degrees

### Scenario: Out-of-range angles are clamped

- **WHEN** a servo command requests an angle beyond physical limits
- **THEN** the angle is clamped to 0-180 degrees and the servo moves to the clamped position

## Requirement: Current servo positions are published on /joint_states at 50 Hz

The firmware SHALL publish `sensor_msgs/JointState` on `/joint_states` at 50 Hz with:
- `name = ["camera_pan_joint", "camera_tilt_joint"]`
- `position = [pan_radians, tilt_radians]` (current servo positions in radians)
- `header.stamp` set to current time

### Scenario: Joint states reflect commanded position

- **WHEN** a servo command sets pan to 1.0 radian
- **THEN** subsequent `/joint_states` messages report `camera_pan_joint` position as 1.0 radian

## Requirement: Servos initialize to center position

The firmware SHALL set both servos to 90 degrees (0 radians = center) on startup.

### Scenario: Startup servo position

- **WHEN** the ESP32 boots and servos are initialized
- **THEN** both pan and tilt servos move to 90 degrees (center)
