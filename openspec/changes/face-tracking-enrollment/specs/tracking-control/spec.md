# ADDED Requirements

## Requirement: Servo pan control

The tracking_controller_node SHALL control the servo pan to keep target centered in frame using fast PID control.

### Scenario: Target slightly off-center

- **WHEN** target is within ±30° of center (servo range)
- **THEN** servo adjusts to center target in frame
- **THEN** wheel yaw velocity remains zero

### Scenario: Servo PID response

- **WHEN** target moves horizontally in frame
- **THEN** servo responds within 20ms (50Hz control loop)
- **THEN** servo smoothly tracks target position

## Requirement: Wheel yaw control

The tracking_controller_node SHALL rotate the robot using wheels when target exceeds servo range.

### Scenario: Target beyond servo range

- **WHEN** servo angle exceeds ±30° from center
- **THEN** wheel yaw command is generated to rotate robot toward target
- **THEN** servo simultaneously moves back toward center

### Scenario: Servo-wheel handoff

- **WHEN** servo reaches 35° while tracking moving target
- **THEN** wheels begin rotating in same direction
- **THEN** servo angle decreases as wheels take over

### Scenario: Wheel response rate

- **WHEN** wheels are commanded to rotate
- **THEN** wheel PID updates at 10Hz (slower than servo)

## Requirement: Forward/backward control

The tracking_controller_node SHALL move robot forward/backward to maintain target distance.

### Scenario: Target too far

- **WHEN** target body_bbox width < 0.15 (target appears small)
- **THEN** robot moves forward

### Scenario: Target too close

- **WHEN** target body_bbox width > 0.35 (target appears large)
- **THEN** robot moves backward

### Scenario: Target at optimal distance

- **WHEN** target body_bbox width is between 0.20-0.30
- **THEN** robot maintains position (linear.x near zero)

## Requirement: Search behavior on target lost

The tracking_controller_node SHALL execute search behavior when target is lost.

### Scenario: Continue last direction

- **WHEN** target is lost (not in TrackedPersonArray for 500ms)
- **THEN** robot continues last movement direction for 0.5 seconds
- **THEN** state changes to SEARCH_CONTINUE

### Scenario: Servo scan

- **WHEN** target still not found after SEARCH_CONTINUE (0.5s elapsed)
- **THEN** servo scans left-right for 2 seconds
- **THEN** state changes to SEARCH_SCAN

### Scenario: Robot rotation

- **WHEN** target still not found after SEARCH_SCAN (2s elapsed)
- **THEN** robot rotates 360° slowly over 5 seconds
- **THEN** state changes to SEARCH_ROTATE

### Scenario: Idle after search

- **WHEN** target still not found after SEARCH_ROTATE (5s elapsed)
- **THEN** robot stops all movement
- **THEN** state changes to IDLE
- **THEN** system waits for target to reappear

### Scenario: Target found during search

- **WHEN** target reappears during any SEARCH state
- **THEN** search behavior cancels immediately
- **THEN** normal tracking resumes

## Requirement: Velocity output

The tracking_controller_node SHALL publish velocity commands on `/cmd_vel` topic.

### Scenario: Tracking active

- **WHEN** target is being tracked
- **THEN** system publishes Twist message with linear.x (forward/back) and angular.z (rotation)

### Scenario: No target

- **WHEN** no target detected and not in search mode
- **THEN** system publishes zero velocity (robot stops)

## Requirement: Servo command output

The tracking_controller_node SHALL publish servo commands on `/servo_cmd` topic.

### Scenario: Servo position update

- **WHEN** tracking controller calculates new servo position
- **THEN** system publishes JointState message with name=["camera_pan_joint"] and position in radians

### Scenario: Servo limits

- **WHEN** calculated servo position exceeds ±π/2 radians (±90°)
- **THEN** system clamps to limit
- **THEN** system relies on wheel rotation for further movement

## Requirement: Configurable PID parameters

The tracking_controller_node SHALL support runtime PID parameter tuning.

### Scenario: Parameter update via ROS2 parameter

- **WHEN** user sets parameter pid_servo_kp via ros2 param set
- **THEN** controller updates PID gain immediately
- **THEN** no node restart required

### Scenario: Default parameters

- **WHEN** node starts without parameter overrides
- **THEN** system uses default PID values from config file

## Requirement: Tracking status for UI

The tracking_controller_node SHALL publish tracking status for UI display.

### Scenario: Active tracking

- **WHEN** target is being tracked
- **THEN** UI can display target name, confidence, and current servo angle

### Scenario: Search mode

- **WHEN** robot is in search mode
- **THEN** UI can display current search state (CONTINUE/SCAN/ROTATE/IDLE)

## Requirement: Firmware tilt servo removal

The ESP32 firmware SHALL NOT include tilt servo control code.

### Scenario: Servo initialization

- **WHEN** ESP32 main firmware starts
- **THEN** only pan servo is initialized
- **THEN** no SERVO_TILT_PIN is accessed

### Scenario: Joint states publication

- **WHEN** firmware publishes /joint_states
- **THEN** only camera_pan_joint is included
- **THEN** camera_tilt_joint is not published

### Scenario: Servo command handling

- **WHEN** /servo_cmd message contains camera_tilt_joint
- **THEN** firmware ignores tilt commands
- **THEN** only camera_pan_joint commands are processed

## Requirement: URDF tilt joint removal

The robot URDF SHALL NOT include camera_tilt_joint.

### Scenario: Robot state publisher

- **WHEN** robot_state_publisher loads URDF
- **THEN** no warning about missing camera_tilt_joint
- **THEN** only camera_pan_joint is expected in /joint_states
