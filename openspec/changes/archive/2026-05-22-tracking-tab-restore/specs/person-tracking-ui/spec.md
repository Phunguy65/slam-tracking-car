## ADDED Requirements

### Requirement: Tracking primary mode tab

The dashboard SHALL provide a "Tracking" tab on the `ModeController` alongside the "SLAM" tab, controlled via mouse click and the `'2'` keyboard shortcut.

#### Scenario: Click activates tracking mode

- **WHEN** the operator clicks the "Tracking" tab on `ModeController`
- **THEN** `primaryMode` becomes `'tracking'`
- **AND** the primary viewport switches to the camera
- **AND** tracking-specific panels render in the bottom layout

#### Scenario: Keyboard shortcut activates tracking mode

- **WHEN** the operator presses `'2'` while no input is focused
- **THEN** `primaryMode` becomes `'tracking'`

#### Scenario: Switching back to SLAM via shortcut

- **WHEN** the operator presses `'1'` while in tracking mode
- **THEN** `primaryMode` becomes `'slam'`
- **AND** the primary viewport switches to the map

#### Scenario: Disabled when ROS not connected

- **WHEN** the rosbridge connection status is not `'connected'`
- **THEN** the "Tracking" tab button is disabled
- **AND** clicking does nothing

### Requirement: Camera primary viewport with person overlay

The dashboard SHALL render `CameraStream` plus `PersonOverlay` as the primary viewport when `primaryMode === 'tracking'`.

#### Scenario: Tracking mode active

- **WHEN** `primaryMode === 'tracking'`
- **THEN** the primary viewport renders `CameraStream` (subscribed to `/camera/image_raw/compressed`)
- **AND** `PersonOverlay` is rendered on top, subscribed to `/tracked_persons`

#### Scenario: SLAM mode active

- **WHEN** `primaryMode === 'slam'`
- **THEN** the primary viewport renders the existing SLAM viewport
- **AND** `PersonOverlay` is not rendered

### Requirement: Person bounding box overlay

The `PersonOverlay` SHALL draw bounding boxes for each tracked person using SVG, with the active target highlighted and metric range shown when finite.

#### Scenario: Body bbox rendered for every tracked person

- **WHEN** a `TrackedPersonArray` message arrives with N persons
- **THEN** the overlay renders N body bboxes using normalised coordinates `(center_x, center_y, width, height)` × container size

#### Scenario: Face bbox rendered when face is visible

- **WHEN** a tracked person has `face_visible === true`
- **THEN** the overlay renders the face bbox alongside the body bbox

#### Scenario: Active target highlighted

- **WHEN** a tracked person has `is_target === true`
- **THEN** that person's body bbox renders with a thick orange border
- **AND** all other persons render with a default border colour

#### Scenario: Range text shown when finite

- **WHEN** a tracked person has `Number.isFinite(range_m) === true`
- **THEN** the overlay renders the range as text near the bbox formatted as one decimal place plus " m" (e.g. "1.2 m")

#### Scenario: Range text omitted when range unknown

- **WHEN** a tracked person has `range_m === NaN` or non-finite
- **THEN** the overlay does not render any range text for that person

### Requirement: Tracking status panel

The tracking panels SHALL bind `/tracking_controller/status` (`std_msgs/String` JSON) to a status display showing state, target id, range, and obstacle.

#### Scenario: Status payload parsed successfully

- **WHEN** a `std_msgs/String` message arrives on `/tracking_controller/status` with valid JSON `{state, target_id, range_m, obstacle}`
- **THEN** the panel displays the state as a badge, the target id (or its resolved name from the enrolment store), `range_m` formatted as one decimal place plus " m", and an obstacle badge when `obstacle === true`

#### Scenario: Status payload range unknown

- **WHEN** the parsed payload has `range_m === null` or non-finite
- **THEN** the panel displays `"—"` for the range field

#### Scenario: Status JSON parse failure

- **WHEN** `JSON.parse` throws on the message data
- **THEN** the panel displays "Status: unavailable"
- **AND** a console warning is logged at most once per session

#### Scenario: Status topic disconnected

- **WHEN** rosbridge is not connected or the topic has no recent message (no message received yet)
- **THEN** the panel displays a Disconnected indicator and no stale fields

### Requirement: Manual override switch

The tracking panels SHALL provide a "Manual Override" switch that is mutually exclusive with the "Tracking enabled" switch.

#### Scenario: Enabling manual override turns off tracking

- **WHEN** the operator turns Manual Override on while Tracking is enabled
- **THEN** Tracking is turned off
- **AND** the joystick begins publishing `/cmd_vel`

#### Scenario: Enabling tracking turns off manual override

- **WHEN** the operator turns Tracking on while Manual Override is enabled
- **THEN** Manual Override is turned off
- **AND** the joystick stops publishing `/cmd_vel`

#### Scenario: Manual override off keeps joystick idle

- **WHEN** Manual Override is off
- **THEN** the joystick does not publish `/cmd_vel`

### Requirement: PID tuner

The tracking panels SHALL expose a PID tuner that updates the nine PID gains on `tracking_controller_node` via `ros2 param` service calls.

#### Scenario: Tuning a gain

- **WHEN** the operator changes a slider or numeric input for any of the nine gains (`pid_servo_kp`, `pid_servo_ki`, `pid_servo_kd`, `pid_wheel_yaw_kp`, `pid_wheel_yaw_ki`, `pid_wheel_yaw_kd`, `pid_linear_kp`, `pid_linear_ki`, `pid_linear_kd`)
- **THEN** the UI calls the `ros2 param set` service for the corresponding parameter on `/tracking_controller_node`

#### Scenario: Service call failure

- **WHEN** the parameter service call fails
- **THEN** the tuner displays an inline error
- **AND** the slider reverts to the last known good value

### Requirement: Lidar minimap overlay during tracking

The dashboard SHALL render a small lidar minimap overlay at a corner of the viewport when `primaryMode === 'tracking'` and `minimapEnabled` is true.

#### Scenario: Minimap renders during tracking

- **WHEN** `primaryMode === 'tracking'` and `minimapEnabled === true`
- **THEN** a `MinimapOverlay` is rendered showing a compact lidar view

#### Scenario: Minimap hidden when disabled

- **WHEN** `minimapEnabled === false`
- **THEN** no minimap overlay renders

### Requirement: Panel state coverage

Every tracking panel SHALL provide explicit Loading, Error, Empty, Disconnected, and Active states.

#### Scenario: Loading state on initial mount

- **WHEN** a panel mounts and has not yet received its first message or service response
- **THEN** the panel displays a loading indicator

#### Scenario: Error state on failure

- **WHEN** a service call fails or message parsing fails
- **THEN** the panel displays an inline error with a retry affordance where applicable

#### Scenario: Empty state with no data

- **WHEN** a panel has loaded successfully but the data set is empty (e.g. zero persons enrolled, no current target)
- **THEN** the panel displays an empty state with a primary call-to-action

#### Scenario: Disconnected state when rosbridge offline

- **WHEN** rosbridge is not `'connected'`
- **THEN** the panel surfaces a disconnected indicator and disables interactive controls

#### Scenario: Active state when data is current

- **WHEN** a panel has fresh data
- **THEN** the panel displays its full content
