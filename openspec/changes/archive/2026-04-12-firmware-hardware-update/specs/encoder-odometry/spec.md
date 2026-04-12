# ADDED Requirements

## Requirement: Encoder ISR counts ticks via hardware interrupts

The firmware SHALL attach rising-edge interrupts on GPIO 32 (left encoder) and GPIO 33 (right encoder). Each interrupt increments a volatile tick counter. ISR functions SHALL be marked `IRAM_ATTR` and contain only a counter increment.

### Scenario: Wheel rotates one full revolution

- **WHEN** the left wheel completes one full rotation
- **THEN** the left encoder tick counter increments by 20 (matching 20 PPR)

### Scenario: ISR does not block main loop

- **WHEN** encoder interrupts fire at maximum rate (~333 Hz at 1000 RPM)
- **THEN** the ISR completes within 2 microseconds and does not affect micro-ROS executor timing

## Requirement: Encoder direction is inferred from cmd_vel

The firmware SHALL track the commanded direction for each motor (forward/backward/stop) based on the most recent `/cmd_vel` message. Encoder ticks SHALL be signed positive for forward rotation and negative for backward rotation based on this tracked direction.

### Scenario: Robot drives forward

- **WHEN** `/cmd_vel` has `linear.x > 0` and both motors are commanded forward
- **THEN** both encoder tick counters increment positively

### Scenario: Robot drives backward

- **WHEN** `/cmd_vel` has `linear.x < 0` and both motors are commanded backward
- **THEN** both encoder tick counters increment negatively (decrement)

## Requirement: Differential drive odometry is computed from encoder ticks

The firmware SHALL compute odometry using differential drive kinematics:
- `delta_left = left_ticks * (2 * PI * WHEEL_RADIUS / ENCODER_PPR)`
- `delta_right = right_ticks * (2 * PI * WHEEL_RADIUS / ENCODER_PPR)`
- `delta_s = (delta_left + delta_right) / 2`
- `delta_theta = (delta_right - delta_left) / WHEEL_SEPARATION`
- Position update: `x += delta_s * cos(theta)`, `y += delta_s * sin(theta)`, `theta += delta_theta`

### Scenario: Robot drives 1 meter straight

- **WHEN** both encoders accumulate ~96 ticks each (0.01037m/tick * 96 ≈ 1.0m)
- **THEN** odometry x position increases by approximately 1.0 meter with y ≈ 0

### Scenario: Robot turns in place

- **WHEN** left motor drives forward and right motor drives backward with equal speed
- **THEN** odometry theta changes while x and y remain approximately constant

## Requirement: Odometry is published on /odom at 50 Hz

The firmware SHALL publish `nav_msgs/Odometry` on the `/odom` topic at 50 Hz (every 20ms). The message SHALL include:
- `header.frame_id = "odom"`
- `child_frame_id = "base_footprint"`
- `pose.pose.position` (x, y, 0)
- `pose.pose.orientation` (quaternion from theta)
- `twist.twist.linear.x` (current linear velocity)
- `twist.twist.angular.z` (current angular velocity)

### Scenario: Odometry publishes at correct rate

- **WHEN** the firmware is running and connected to micro-ROS agent
- **THEN** `/odom` messages arrive at approximately 50 Hz

### Scenario: Odometry frame IDs are correct

- **WHEN** a `/odom` message is received
- **THEN** `header.frame_id` is `"odom"` and `child_frame_id` is `"base_footprint"`
