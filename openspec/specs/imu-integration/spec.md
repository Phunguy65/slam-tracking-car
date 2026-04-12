# ADDED Requirements

## Requirement: MPU6050 is initialized via I2C on startup

The firmware SHALL initialize the MPU6050 sensor over I2C (SDA=GPIO 21, SCL=GPIO 22) using the electroniccats/MPU6050 library with DMP enabled. Initialization SHALL retry up to 3 times with 500ms delay between attempts.

### Scenario: MPU6050 initializes successfully

- **WHEN** the ESP32 boots and MPU6050 responds on I2C address 0x68
- **THEN** DMP is initialized, and IMU data reading begins

### Scenario: MPU6050 fails all 3 init attempts

- **WHEN** MPU6050 does not respond after 3 retries
- **THEN** IMU is disabled, firmware continues without publishing `/imu/data_raw`, and a warning is logged to Serial

## Requirement: Raw IMU data is published on /imu/data_raw at 50 Hz

The firmware SHALL publish `sensor_msgs/Imu` on `/imu/data_raw` at 50 Hz containing:
- `header.frame_id = "imu_link"`
- `angular_velocity` (x, y, z in rad/s from gyroscope)
- `linear_acceleration` (x, y, z in m/s^2 from accelerometer)
- `orientation` set to identity quaternion (orientation estimation delegated to PC EKF)
- `orientation_covariance[0] = -1` (indicating orientation is not provided)

### Scenario: IMU data arrives at correct rate

- **WHEN** MPU6050 is initialized successfully and micro-ROS agent is connected
- **THEN** `/imu/data_raw` messages arrive at approximately 50 Hz

### Scenario: IMU data has correct frame ID

- **WHEN** a `/imu/data_raw` message is received
- **THEN** `header.frame_id` is `"imu_link"`

### Scenario: IMU disabled does not affect other publishers

- **WHEN** MPU6050 initialization failed and IMU is disabled
- **THEN** `/odom`, `/scan`, and `/joint_states` topics continue publishing normally
