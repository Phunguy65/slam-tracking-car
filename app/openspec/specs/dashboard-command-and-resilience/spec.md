# Dashboard Command and Resilience

## Requirement: SLAM control gating

The dashboard SHALL enforce mode-specific manual control rules so that joystick input is only available when the active workflow permits manual motion.

### Scenario: Auto Explore disables manual driving

- **WHEN** the operator enables Auto Explore in SLAM mapping mode
- **THEN** joystick input is disabled until Auto Explore is turned off

### Scenario: Manual mapping enables joystick control

- **WHEN** the operator is in SLAM mapping mode with Auto Explore turned off
- **THEN** joystick input is available for manual driving during mapping

### Scenario: Navigation prevents manual joystick driving

- **WHEN** the operator is in SLAM navigation mode
- **THEN** the dashboard disables joystick driving and exposes waypoint-based navigation controls instead

## Requirement: Tracking manual override

The dashboard SHALL provide a manual override path during tracking without requiring the operator to leave Tracking mode.

### Scenario: Taking manual control while tracking

- **WHEN** the operator invokes manual override during Tracking mode
- **THEN** the dashboard exposes manual movement controls while keeping the tracking workspace active

### Scenario: Returning to tracking control after override

- **WHEN** the operator exits manual override during Tracking mode
- **THEN** the dashboard returns to standard tracking control behavior without a route change

## Requirement: Keyboard-accessible operator commands

The dashboard SHALL expose keyboard shortcuts for critical operator actions and preserve keyboard navigability across interactive panels.

### Scenario: Emergency stop shortcut

- **WHEN** the operator presses the Space key while the dashboard is active
- **THEN** the system triggers the emergency stop action

### Scenario: Directional driving shortcut

- **WHEN** the operator presses an arrow key while a joystick-enabled workflow is active and focus is not inside an editable control
- **THEN** the dashboard issues the corresponding directional movement command

### Scenario: Primary mode shortcut

- **WHEN** the operator presses `1` or `2` while the dashboard is active
- **THEN** the dashboard switches to the mapped primary mode without changing routes

### Scenario: Keyboard panel navigation

- **WHEN** the operator navigates the dashboard with the Tab key
- **THEN** all interactive panels and controls are reachable in a logical focus order with accessible names

## Requirement: Dashboard fault feedback

The dashboard SHALL present explicit recovery-oriented feedback for ROS connection failures, stream failures, and inline ROS errors.

### Scenario: ROS connection lost

- **WHEN** the ROS connection is lost while the dashboard is active
- **THEN** the system shows a reconnecting overlay with retry affordance until connectivity is restored or the operator retries

### Scenario: Camera or viewport stream unavailable

- **WHEN** the active viewport stream cannot be rendered
- **THEN** the affected viewport shows a `No Signal` placeholder instead of a blank surface

### Scenario: Inline ROS error reporting

- **WHEN** a ROS-backed command or mode transition fails while the dashboard is active
- **THEN** the dashboard shows an inline error banner with actionable details in the relevant control region
