# ADDED Requirements

## Requirement: rosbridge_suite is installed and launchable

The development container SHALL include `ros-humble-rosbridge-suite` package. A launch file SHALL exist to start the rosbridge WebSocket server on port 9090.

### Scenario: rosbridge starts with dashboard launch

- **WHEN** user runs `ros2 launch slam_car_bringup dashboard.launch.py`
- **THEN** rosbridge_websocket starts listening on `ws://0.0.0.0:9090`

### Scenario: rosbridge accessible from browser

- **WHEN** web dashboard connects to `ws://localhost:9090`
- **THEN** rosbridge accepts the WebSocket connection and begins protocol handshake

## Requirement: Dashboard maintains persistent rosbridge connection

The dashboard SHALL establish and maintain a WebSocket connection to rosbridge. Connection state SHALL be managed globally via Zustand store. The dashboard SHALL automatically attempt reconnection on disconnect.

### Scenario: Initial connection

- **WHEN** dashboard loads
- **THEN** roslibjs connects to `ws://localhost:9090` within 3 seconds

### Scenario: Connection lost and recovered

- **WHEN** WebSocket connection drops
- **THEN** dashboard displays "Disconnected" status
- **AND** attempts reconnection every 2 seconds
- **AND** on reconnection, resubscribes to all active topics

## Requirement: Dashboard displays connection status

The dashboard SHALL display a connection status badge in the header showing current rosbridge connection state. Badge SHALL show "Connected" (green) or "Disconnected" (red) with visual indicator.

### Scenario: Connected state

- **WHEN** rosbridge WebSocket is connected
- **THEN** status badge shows green dot with "Connected" text

### Scenario: Disconnected state

- **WHEN** rosbridge WebSocket is disconnected
- **THEN** status badge shows red dot with "Disconnected" text and pulsing animation

## Requirement: Dashboard provides emergency stop

The dashboard SHALL display an always-visible emergency stop button in the header. Pressing emergency stop SHALL immediately publish zero velocity to `/cmd_vel` and cancel any active navigation or exploration actions.

### Scenario: Emergency stop pressed

- **WHEN** user clicks the emergency stop button
- **THEN** dashboard publishes `Twist(linear.x=0, angular.z=0)` to `/cmd_vel`
- **AND** cancels any active NavigateToPose action
- **AND** cancels any active Explore action
- **AND** disables tracking and explore toggles

### Scenario: Emergency stop via keyboard

- **WHEN** user presses Spacebar key anywhere in dashboard
- **THEN** emergency stop activates (same behavior as button click)

## Requirement: image_transport republisher is configured

The launch file SHALL include an image_transport republish node to convert `/camera/image_raw` to `/camera/image_raw/compressed` with JPEG compression.

### Scenario: Compressed topic available

- **WHEN** cam_bridge_node publishes to `/camera/image_raw`
- **THEN** `/camera/image_raw/compressed` topic is also available with JPEG-compressed frames

## Requirement: Dashboard supports topic subscription

The dashboard SHALL be able to subscribe to ROS2 topics via rosbridge. Subscriptions SHALL use the roslibjs Topic API with configurable message type and throttle rate.

### Scenario: Subscribe to camera topic

- **WHEN** dashboard subscribes to `/camera/image_raw/compressed` with type `sensor_msgs/CompressedImage`
- **THEN** callback receives compressed image messages at camera publish rate

### Scenario: Subscribe to scan topic

- **WHEN** dashboard subscribes to `/scan` with type `sensor_msgs/LaserScan`
- **THEN** callback receives LaserScan messages at 5 Hz (LiDAR rate)

## Requirement: Dashboard supports service calls

The dashboard SHALL be able to call ROS2 services via rosbridge. Service calls SHALL use the roslibjs Service API with request/response handling.

### Scenario: Call set_parameters service

- **WHEN** dashboard calls `/face_follow_controller/set_parameters` with parameter values
- **THEN** service returns success/failure result

## Requirement: Dashboard supports action clients

The dashboard SHALL be able to send goals and cancel actions via rosbridge. Action communication SHALL use the roslibjs ActionClient API.

### Scenario: Send navigation goal

- **WHEN** dashboard sends goal to `/navigate_to_pose` action
- **THEN** action server receives goal and begins execution
- **AND** dashboard receives feedback and result callbacks
