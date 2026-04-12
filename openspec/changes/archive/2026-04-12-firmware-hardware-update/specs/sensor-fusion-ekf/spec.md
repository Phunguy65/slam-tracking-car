# ADDED Requirements

## Requirement: robot_localization EKF fuses odom and IMU

The PC-side `robot_localization` `ekf_node` SHALL subscribe to `/odom` (nav_msgs/Odometry) and `/imu/data_raw` (sensor_msgs/Imu) and publish fused output on `/odometry/filtered` (nav_msgs/Odometry).

### Scenario: EKF produces fused odometry

- **WHEN** both `/odom` and `/imu/data_raw` are publishing
- **THEN** `/odometry/filtered` is published with fused pose and velocity estimates

### Scenario: EKF operates with odom only

- **WHEN** `/odom` is publishing but `/imu/data_raw` is not available (IMU disabled)
- **THEN** `/odometry/filtered` is published based on encoder odometry alone (degraded mode)

## Requirement: robot_localization publishes TF odom to base_footprint

The EKF node SHALL publish the TF transform `odom → base_footprint` based on the fused odometry estimate. ESP32 firmware SHALL NOT publish this transform.

### Scenario: TF tree is correct

- **WHEN** the robot bringup launches with robot_localization
- **THEN** `ros2 run tf2_ros tf2_echo odom base_footprint` returns valid transform data

## Requirement: EKF configuration uses correct frame IDs

The `ekf.yaml` configuration SHALL specify:
- `odom_frame: odom`
- `base_link_frame: base_footprint`
- `world_frame: odom`
- `/odom` input: fuse x, y, yaw from pose; fuse vx, vyaw from twist
- `/imu/data_raw` input: fuse angular velocity z and linear acceleration x

### Scenario: Frame IDs match URDF and firmware

- **WHEN** the EKF node starts
- **THEN** it publishes TF from `odom` to `base_footprint` matching the URDF frame hierarchy

## Requirement: robot.launch.py includes EKF node

The `robot.launch.py` launch file SHALL include the `robot_localization` `ekf_node` with the `ekf.yaml` config file.

### Scenario: Robot bringup launches EKF

- **WHEN** `ros2 launch slam_car_bringup robot.launch.py` is executed
- **THEN** the `ekf_node` is running and publishing `/odometry/filtered`

## Requirement: Nav2 uses fused odometry

The `nav2_params.yaml` SHALL reference `/odometry/filtered` as the odometry topic for `bt_navigator` and costmap configurations where applicable.

### Scenario: Nav2 receives fused odometry

- **WHEN** Nav2 navigation stack is running
- **THEN** it subscribes to `/odometry/filtered` for path planning and obstacle avoidance
