# ADDED Requirements

## Requirement: m-explore-ros2 is built and available

The development container SHALL include `m-explore-ros2` package built from source. The package SHALL provide the `explore_lite` node with frontier exploration capabilities.

### Scenario: m-explore node launchable

- **WHEN** user runs the explore node
- **THEN** explore_lite starts and connects to SLAM Toolbox map and Nav2 for navigation

## Requirement: Frontier exploration navigates to unexplored areas

The explore_lite node SHALL detect frontiers (boundaries between known and unknown space) and autonomously navigate to them using Nav2. The node SHALL continue exploring until no more frontiers exist.

### Scenario: Robot explores frontier

- **WHEN** explore_lite detects a frontier at coordinates (3.0, 2.0)
- **THEN** explore_lite sends NavigateToPose goal to Nav2
- **AND** robot navigates to the frontier location

### Scenario: All frontiers explored

- **WHEN** explore_lite detects no remaining frontiers
- **THEN** explore_lite reports "exploration complete" status
- **AND** stops sending navigation goals

## Requirement: Frontier exploration integrates with dashboard

The explore_lite node SHALL expose an action interface that the dashboard can use to start/stop exploration. The action SHALL provide feedback on current exploration state.

### Scenario: Dashboard starts exploration

- **WHEN** dashboard sends goal to exploration action server
- **THEN** explore_lite begins frontier detection and navigation

### Scenario: Dashboard cancels exploration

- **WHEN** dashboard cancels the exploration action
- **THEN** explore_lite stops and cancels any active Nav2 goal

## Requirement: Frontier exploration launch integration

The dashboard launch file SHALL include the explore_lite node configured for the robot's map and navigation setup.

### Scenario: Explore node starts with dashboard

- **WHEN** user runs `ros2 launch slam_car_bringup dashboard.launch.py mode:=slam`
- **THEN** explore_lite node starts alongside SLAM Toolbox and Nav2
