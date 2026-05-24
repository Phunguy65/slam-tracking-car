# ADDED Requirements

## Requirement: Dashboard displays saved map for navigation

The dashboard SHALL display the currently loaded map in navigation mode. The map SHALL be the same occupancy grid format as mapping mode but sourced from the saved map file via map_server.

### Scenario: Saved map displays

- **WHEN** user enters navigation mode with a map loaded
- **THEN** the Canvas displays the saved occupancy grid map

## Requirement: Dashboard provides initial pose setting

The dashboard SHALL allow users to set the robot's initial pose for AMCL localization by clicking on the map. Clicking SHALL publish a `PoseWithCovarianceStamped` message to `/initialpose` topic.

### Scenario: User sets initial pose

- **WHEN** user clicks on map location (x=2.0, y=1.5) and drags to set orientation (theta=45°)
- **THEN** dashboard publishes to `/initialpose` with `pose.position.x=2.0`, `pose.position.y=1.5`, and orientation quaternion for 45°

### Scenario: Initial pose required before navigation

- **WHEN** user attempts to set navigation goal without setting initial pose
- **THEN** dashboard displays prompt "Set initial robot position first"

## Requirement: Dashboard provides click-to-navigate goal setting

The dashboard SHALL allow users to set navigation goals by clicking on the map. Clicking SHALL send a goal to the `/navigate_to_pose` action server. The goal pose orientation SHALL default to facing the click direction from current robot position.

### Scenario: User sets navigation goal

- **WHEN** user clicks on map location (x=5.0, y=3.0)
- **THEN** dashboard sends NavigateToPose action goal with target position (5.0, 3.0)
- **AND** robot begins navigating to that location

### Scenario: Navigation in progress indicator

- **WHEN** NavigateToPose action is active
- **THEN** dashboard displays "Navigating..." status and goal marker on map

### Scenario: Navigation succeeds

- **WHEN** robot reaches goal within tolerance (xy: 0.15m, yaw: 0.25rad)
- **THEN** dashboard displays "Goal Reached" status and clears goal marker

### Scenario: Navigation fails

- **WHEN** NavigateToPose action returns failure (e.g., path blocked)
- **THEN** dashboard displays error toast with failure reason

## Requirement: Dashboard displays robot position during navigation

The dashboard SHALL display the robot's current position on the saved map during navigation. Position marker SHALL be identical to mapping mode, derived from TF `map → base_footprint`.

### Scenario: Robot position tracks during navigation

- **WHEN** robot is navigating to a goal
- **THEN** robot marker position updates in real-time on the map Canvas
