## MODIFIED Requirements

### Requirement: Mode-aware dashboard layout

The dashboard SHALL adapt its primary viewport and supporting control panels according to the active primary mode and SLAM submode while preserving a consistent HUD shell.

#### Scenario: SLAM mapping layout

- **WHEN** the operator is in SLAM mode with mapping active
- **THEN** the occupancy map is shown as the primary viewport and SLAM mapping controls are shown in dashboard panels

#### Scenario: SLAM navigation layout

- **WHEN** the operator is in SLAM mode with navigation active
- **THEN** the occupancy map remains the primary viewport and navigation-specific controls for saved maps and waypoint actions are shown in dashboard panels

#### Scenario: Tracking layout

- **WHEN** the operator is in Tracking mode
- **THEN** the camera stream is shown as the primary viewport with `PersonOverlay` rendered on top
- **AND** tracking-specific controls (status panel, target management, manual override, PID tuner) are shown in dashboard panels

### Requirement: Secondary context viewport

The dashboard SHALL show a secondary context view that complements the active primary viewport.

#### Scenario: Camera context during SLAM workflows

- **WHEN** the operator is in any SLAM workflow
- **THEN** the dashboard shows the live camera feed as a picture-in-picture secondary view over the map workspace

#### Scenario: Map context during tracking workflows

- **WHEN** the operator is in Tracking mode
- **THEN** the dashboard shows a compact lidar-based minimap overlay as the secondary spatial context while the camera remains primary

## ADDED Requirements

### Requirement: Tracking status JSON binding

The dashboard SHALL bind `/tracking_controller/status` (`std_msgs/String` containing JSON `{state, target_id, range_m, obstacle}`) to the tracking status panel via a typed parse helper.

#### Scenario: Successful parse and render

- **WHEN** a `std_msgs/String` message arrives on `/tracking_controller/status` with valid JSON payload
- **THEN** the parse helper returns a typed `TrackingControllerStatus` object
- **AND** the panel renders the state, target id (or its resolved person name), `range_m`, and obstacle badge

#### Scenario: Parse failure degrades gracefully

- **WHEN** `JSON.parse` throws on the message data
- **THEN** the parse helper returns `null`
- **AND** the panel displays "Status: unavailable"
- **AND** the application does not crash

### Requirement: Person overlay metric range

The person overlay rendered during tracking mode SHALL display a `range_m` text label near each tracked person bbox when the value is finite.

#### Scenario: Finite range shown

- **WHEN** a tracked person has `Number.isFinite(range_m) === true`
- **THEN** the overlay renders a text label such as "1.2 m" near the person's body bbox

#### Scenario: Non-finite range omitted

- **WHEN** a tracked person has `range_m` equal to `NaN` or otherwise non-finite
- **THEN** no range text is rendered for that person

### Requirement: Tracking primary mode keyboard shortcut

The dashboard SHALL bind keyboard shortcut `'2'` to switch `primaryMode` to `'tracking'`, and `'1'` to switch back to `'slam'`.

#### Scenario: Switch to tracking via keyboard

- **WHEN** the operator presses `'2'` while no input element has focus
- **THEN** `primaryMode` becomes `'tracking'`

#### Scenario: Switch to SLAM via keyboard

- **WHEN** the operator presses `'1'` while no input element has focus
- **THEN** `primaryMode` becomes `'slam'`

#### Scenario: Shortcut suppressed inside text inputs

- **WHEN** the operator presses `'1'` or `'2'` while typing inside a text input or textarea
- **THEN** the shortcut does not fire and the keystroke reaches the input as normal text
