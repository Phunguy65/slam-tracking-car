# ADDED Requirements

## Requirement: Dashboard displays live occupancy grid map

The dashboard SHALL render the SLAM Toolbox occupancy grid from `/map` topic to a Canvas element. The map SHALL update in real-time as SLAM Toolbox publishes new data. Free space SHALL render as dark, occupied space as light, and unknown space as mid-gray.

### Scenario: Map renders during active mapping

- **WHEN** SLAM Toolbox is running and publishing `/map`
- **THEN** the Canvas displays the occupancy grid with robot's explored area visible

### Scenario: Map updates as robot explores

- **WHEN** the robot moves and SLAM Toolbox publishes updated `/map`
- **THEN** the Canvas updates to show newly explored areas within 200ms

## Requirement: Dashboard displays robot position on map

The dashboard SHALL display the robot's current position and orientation on the map as a distinct marker. Position SHALL be derived from TF transform `map → base_footprint`. The marker SHALL include a heading indicator showing robot orientation.

### Scenario: Robot position updates in real-time

- **WHEN** TF publishes new `map → base_footprint` transform
- **THEN** the robot marker position and orientation update on the map Canvas

### Scenario: TF data stale

- **WHEN** no TF update received for > 2 seconds
- **THEN** the robot marker displays a "stale" visual indicator (e.g., transparency or outline)

## Requirement: Dashboard displays LiDAR radar visualization

The dashboard SHALL render a radar-style visualization of LiDAR scan data from `/scan` topic. The radar SHALL display all scan points (not just minimum distance like legacy). The robot position SHALL be at center with scan points rendered radially.

### Scenario: Full 360-degree scan displayed

- **WHEN** `/scan` topic publishes LaserScan with 360 points
- **THEN** all valid points render on the radar with distance proportional to radius

### Scenario: Close obstacles highlighted

- **WHEN** scan points are within 50cm of robot
- **THEN** those points render in warning color (red/orange)

## Requirement: Dashboard provides manual joystick control

The dashboard SHALL provide a virtual joystick for manual robot control. Joystick X-axis SHALL map to `angular.z` (rotation) and Y-axis to `linear.x` (forward/backward). The joystick SHALL publish to `/cmd_vel` at 10 Hz while active.

### Scenario: User pushes joystick forward

- **WHEN** user pushes joystick fully forward (Y = 1.0)
- **THEN** dashboard publishes `Twist(linear.x=0.3, angular.z=0)` to `/cmd_vel`

### Scenario: User pushes joystick diagonally

- **WHEN** user pushes joystick forward-right (Y = 0.7, X = 0.5)
- **THEN** dashboard publishes `Twist(linear.x=0.21, angular.z=-0.5)` to `/cmd_vel`

### Scenario: User releases joystick

- **WHEN** user releases the joystick
- **THEN** dashboard publishes `Twist(linear.x=0, angular.z=0)` to `/cmd_vel`

## Requirement: Dashboard provides frontier exploration control

The dashboard SHALL provide a toggle to start/stop autonomous frontier exploration via the m-explore action server. When enabled, the robot SHALL autonomously navigate to unexplored frontiers.

### Scenario: User starts auto-explore

- **WHEN** user enables the auto-explore toggle
- **THEN** dashboard sends goal to `/explore/explore` action server
- **AND** robot begins navigating to nearest frontier

### Scenario: User stops auto-explore

- **WHEN** user disables the auto-explore toggle
- **THEN** dashboard cancels the active explore action
- **AND** robot stops at current position

### Scenario: Exploration complete

- **WHEN** m-explore reports no more frontiers (exploration complete)
- **THEN** auto-explore toggle automatically disables
- **AND** status shows "Exploration Complete"

## Requirement: Dashboard provides map save functionality

The dashboard SHALL provide a button to save the current map. Saving SHALL call the `/slam_toolbox/save_map` service. Saved maps SHALL be stored in `src/slam_car_bringup/maps/` directory.

### Scenario: User saves map

- **WHEN** user clicks "Save Map" button and enters filename "office_floor1"
- **THEN** dashboard calls `/slam_toolbox/save_map` service
- **AND** map files are saved as `office_floor1.yaml` and `office_floor1.pgm`

### Scenario: Save fails

- **WHEN** save_map service returns error
- **THEN** dashboard displays error toast with service error message

## Requirement: Dashboard provides map load functionality

The dashboard SHALL display a list of available saved maps and allow loading for navigation mode. Loading a map SHALL configure the map_server to serve the selected map.

### Scenario: User views available maps

- **WHEN** user opens map selector in navigation mode
- **THEN** dashboard displays list of `.yaml` files from maps directory

### Scenario: User loads saved map

- **WHEN** user selects "office_floor1" from map list
- **THEN** navigation mode uses that map for localization and planning
