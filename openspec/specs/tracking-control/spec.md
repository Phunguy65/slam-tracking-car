## ADDED Requirements

### Requirement: Servo pan control

The `tracking_controller_node` SHALL control the servo pan to keep the target centred in frame using a fast PID loop.

#### Scenario: Target slightly off-centre

- **WHEN** the target's bearing is within `servo_handoff_threshold` (±30°) of centre
- **THEN** the servo adjusts to centre the target in frame
- **AND** the wheel yaw velocity remains zero

#### Scenario: Servo PID response

- **WHEN** the target moves horizontally in the frame
- **THEN** the servo responds within 20 ms (50 Hz control loop)
- **AND** smoothly tracks the target position

### Requirement: Wheel yaw control

The `tracking_controller_node` SHALL rotate the robot using the wheels when the target exceeds the servo range.

#### Scenario: Target beyond servo range

- **WHEN** the servo angle exceeds `servo_handoff_threshold` (±30°) from centre
- **THEN** a wheel-yaw command is generated to rotate the robot toward the target
- **AND** the servo simultaneously moves back toward centre

#### Scenario: Servo–wheel handoff

- **WHEN** the servo reaches 35° while tracking a moving target
- **THEN** the wheels begin rotating in the same direction
- **AND** the servo angle decreases as the wheels take over

#### Scenario: Wheel response rate

- **WHEN** the wheels are commanded to rotate
- **THEN** the wheel PID updates at 10 Hz

### Requirement: Range-based linear control

The `tracking_controller_node` SHALL command linear velocity from the metric `range_m` of the target rather than from `body_bbox` width.

#### Scenario: Target at optimal distance

- **WHEN** `range_m` is between `target_distance_min` and `target_distance_max` (default 1.0–1.5 m)
- **THEN** `linear.x` is zero (deadband)

#### Scenario: Target far away

- **WHEN** `range_m` exceeds `distance_too_far` (default 2.5 m)
- **THEN** the robot moves forward at `max_linear_speed`

#### Scenario: Target close

- **WHEN** `range_m` is below `distance_too_close` (default 0.6 m)
- **THEN** the robot moves backward at `max_linear_speed`

#### Scenario: Target between deadband and limits

- **WHEN** `range_m` is between `target_distance_max` and `distance_too_far`
- **THEN** the linear PID drives forward proportional to `range_m − target_distance_center`
- **WHEN** `range_m` is between `distance_too_close` and `target_distance_min`
- **THEN** the linear PID drives backward proportional to `range_m − target_distance_center`

#### Scenario: Range unknown

- **WHEN** the active target's `range_m` is `NaN`
- **THEN** `linear.x` is forced to zero
- **AND** servo and wheel-yaw control continue using `bearing_rad`

### Requirement: Front-arc safety

The `tracking_controller_node` SHALL halt forward motion when an obstacle is detected in the front arc.

#### Scenario: Obstacle within safety distance

- **WHEN** the minimum range across the front arc (±`front_safety_half_arc_rad`, default 0.35 rad ≈ ±20°) is below `front_safety_distance` (default 0.3 m)
- **THEN** `linear.x` is forced to zero
- **AND** servo and wheel-yaw control continue normally to keep the target framed
- **AND** the status payload's `obstacle` field is `true`

#### Scenario: Obstacle clears

- **WHEN** the front arc minimum range rises above `front_safety_distance`
- **THEN** the linear PID resumes commanding `linear.x`
- **AND** the status payload's `obstacle` field returns to `false`

### Requirement: Search behaviour on target lost

The `tracking_controller_node` SHALL execute progressive search behaviour when the target is lost.

#### Scenario: Continue last direction

- **WHEN** the target has not appeared in `TrackedPersonArray` for `lost_timeout` (0.5 s)
- **THEN** the robot continues the last movement direction for `search_continue_duration` (0.5 s)
- **AND** the state becomes `SEARCH_CONTINUE`

#### Scenario: Servo scan

- **WHEN** the target is still not found after `SEARCH_CONTINUE`
- **THEN** the servo scans left-right for `search_scan_duration` (2 s)
- **AND** the state becomes `SEARCH_SCAN`

#### Scenario: Robot rotation

- **WHEN** the target is still not found after `SEARCH_SCAN`
- **THEN** the robot rotates 360° over `search_rotate_duration` (5 s)
- **AND** the state becomes `SEARCH_ROTATE`

#### Scenario: Idle after search

- **WHEN** the target is still not found after `SEARCH_ROTATE`
- **THEN** the robot stops all movement
- **AND** the state becomes `IDLE`

#### Scenario: Target found during search

- **WHEN** the target reappears in any search state
- **THEN** the search behaviour is cancelled immediately
- **AND** normal tracking resumes

### Requirement: Velocity output

The `tracking_controller_node` SHALL publish velocity commands on `/cmd_vel`.

#### Scenario: Tracking active

- **WHEN** the target is being tracked
- **THEN** the system publishes a `Twist` with `linear.x` and `angular.z` (subject to safety and range gating)

#### Scenario: No target

- **WHEN** no target is detected and the controller is not in a search state
- **THEN** the system publishes zero velocity (robot stops)

### Requirement: Servo command output

The `tracking_controller_node` SHALL publish servo commands on `/servo_cmd`.

#### Scenario: Servo position update

- **WHEN** the controller calculates a new servo position
- **THEN** it publishes a `JointState` with `name=["camera_pan_joint"]` and `position` in radians

#### Scenario: Servo limits

- **WHEN** the calculated servo position exceeds `max_servo_angle` (default 1.57 rad)
- **THEN** the value is clamped to the limit
- **AND** further rotation is delegated to the wheels

### Requirement: Status output for UI

The `tracking_controller_node` SHALL publish a status payload on `/tracking_controller/status` at 5 Hz for the dashboard.

#### Scenario: Status payload contents

- **WHEN** the status timer fires
- **THEN** a `std_msgs/String` is published whose body is JSON with fields:
  - `state` — one of `IDLE`, `TRACKING`, `SEARCH_CONTINUE`, `SEARCH_SCAN`, `SEARCH_ROTATE`
  - `target_id` — string (empty when no target)
  - `range_m` — float (NaN-safe; `null` when range unknown)
  - `obstacle` — bool

#### Scenario: Search state visibility

- **WHEN** the controller is in a search state
- **THEN** `state` reflects the current search phase and `target_id` is the lost target's id (or empty)

### Requirement: Configurable PID and behaviour parameters

The `tracking_controller_node` SHALL support runtime parameter tuning for PID gains, distances, and search durations.

#### Scenario: Parameter update via `ros2 param set`

- **WHEN** the user sets `pid_servo_kp` via `ros2 param set`
- **THEN** the controller updates the gain immediately without restart

#### Scenario: Default parameters

- **WHEN** the node starts without overrides
- **THEN** values from `person_tracker.yaml` are used

### Requirement: Firmware tilt servo absence

The ESP32 firmware SHALL NOT include tilt-servo control code.

#### Scenario: Servo initialisation

- **WHEN** the ESP32 main firmware starts
- **THEN** only the pan servo is initialised
- **AND** no `SERVO_TILT_PIN` is accessed

#### Scenario: Joint-state publication

- **WHEN** the firmware publishes `/joint_states`
- **THEN** only `camera_pan_joint` is included

#### Scenario: Servo command handling

- **WHEN** a `/servo_cmd` message contains `camera_tilt_joint`
- **THEN** the firmware ignores the tilt entry and processes only `camera_pan_joint`

### Requirement: URDF tilt joint absence

The robot URDF SHALL NOT include `camera_tilt_joint`.

#### Scenario: Robot state publisher

- **WHEN** `robot_state_publisher` loads the URDF
- **THEN** there is no warning about a missing `camera_tilt_joint`
- **AND** only `camera_pan_joint` is expected in `/joint_states`
