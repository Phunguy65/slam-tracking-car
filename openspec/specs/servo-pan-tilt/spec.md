# Servo Pan/Tilt

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

## Requirement: Face follow controller supports live PID parameter updates

The face_follow_controller node SHALL register a parameter callback that applies PID parameter changes immediately without requiring node restart. Parameters `pid_yaw_kp`, `pid_yaw_ki`, `pid_yaw_kd`, `pid_linear_kp`, `pid_linear_ki`, `pid_linear_kd` SHALL be dynamically reconfigurable.

### Scenario: PID parameter updated via set_parameters service

- **WHEN** `/face_follow_controller/set_parameters` service is called with `pid_yaw_kp=0.5`
- **THEN** the controller immediately uses Kp=0.5 for yaw PID calculations
- **AND** subsequent control loop iterations use the new parameter value

### Scenario: Multiple parameters updated simultaneously

- **WHEN** `set_parameters` service is called with `pid_yaw_kp=0.4`, `pid_yaw_ki=0.01`, `pid_yaw_kd=0.08`
- **THEN** all three parameters are applied atomically before next control loop iteration

### Scenario: Invalid parameter value rejected

- **WHEN** `set_parameters` service is called with `pid_yaw_kp=-1.0` (negative value)
- **THEN** service returns failure with reason "PID gains must be non-negative"
- **AND** current parameter values remain unchanged
