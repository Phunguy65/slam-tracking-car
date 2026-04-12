# Tasks

## 1. Platform & Build Configuration

- [x] 1.1 Update `firmware/platformio.ini`: change `espressif32@2.0.18` to `espressif32@6.13.0`, add `electroniccats/MPU6050@^1.4.4` and `madhephaestus/ESP32Servo@^3.0.6` to `lib_deps`, add `board_microros_user_meta` reference
- [x] 1.2 Create `firmware/micro_ros.meta` with `RMW_UXRCE_MAX_PUBLISHERS=15`, `RMW_UXRCE_MAX_SUBSCRIPTIONS=10`, `RMW_UXRCE_MAX_HISTORY=8`, `RMW_UXRCE_STREAM_HISTORY=4`, and MTU=2048
- [x] 1.3 Verify `pio run -e esp32_main` compiles with the new platform — RESOLVED via isolated build script (`firmware/scripts/pio_isolated_build.sh`)

## 2. GPIO Configuration (config.h)

- [x] 2.1 Rewrite `firmware/include/config.h`: replace L298N motor pins with TB6612FNG (Left: PWMA=25, AIN1=26, AIN2=27; Right: PWMB=14, BIN1=23, BIN2=13), update LiDAR motor pin to GPIO 4, add Servo 2 pin (GPIO 19), add IMU SDA/SCL (GPIO 21/22), add encoder pins (GPIO 32/33), add `ENCODER_PPR=20`, add LEDC channel constants (Ch0-4)
- [x] 2.2 Update `firmware/include/config.h.example` to mirror the new config.h structure with placeholder WiFi/agent values

## 3. Motor Control (TB6612FNG)

- [x] 3.1 Rewrite `setup_motors()` in `main.cpp`: use new TB6612FNG GPIO defines, assign LEDC channels 0 and 1 for left/right motor PWM
- [x] 3.2 Update `apply_cmd_vel()`: change pin references from L298N names (IN1/IN2/IN3/IN4/ENA/ENB) to TB6612 names (AIN1/AIN2/BIN1/BIN2/PWMA/PWMB), keep differential drive kinematics unchanged

## 4. Encoder Odometry

- [x] 4.1 Add encoder ISR functions: two `IRAM_ATTR` ISRs for GPIO 32/33 with volatile tick counters, attach as RISING edge interrupts in setup
- [x] 4.2 Add motor direction tracking: store last commanded direction (forward/backward/stop) per motor from `apply_cmd_vel()`, use to sign encoder ticks
- [x] 4.3 Implement differential drive odometry computation: read & reset tick counters with critical section, compute delta_left/delta_right/delta_s/delta_theta, accumulate x/y/theta
- [x] 4.4 Add `/odom` publisher (nav_msgs/Odometry): init publisher in setup, populate message with pose (x,y,quaternion from theta), twist (linear.x, angular.z), frame_id="odom", child_frame_id="base_footprint"
- [x] 4.5 Publish `/odom` in the fast timer callback (50 Hz)

## 5. IMU Integration (MPU6050)

- [x] 5.1 Add MPU6050 initialization: Wire.begin(SDA=21, SCL=22), init DMP with retry loop (3 attempts, 500ms delay), set `imu_enabled` flag
- [x] 5.2 Add `/imu/data_raw` publisher (sensor_msgs/Imu): init publisher in setup, frame_id="imu_link", orientation_covariance[0]=-1 (not provided)
- [x] 5.3 Read MPU6050 raw accel+gyro data in the fast timer callback (50 Hz), populate and publish `/imu/data_raw` only if `imu_enabled`

## 6. LiDAR Integration (LDS02RR via kaiaai/LDS)

- [x] 6.1 Rewrite `setup_lidar()`: initialize kaiaai/LDS library on UART2 (RX=GPIO 16), register scan point callback, configure motor PWM on GPIO 4 (LEDC channel 2, 25kHz)
- [x] 6.2 Implement LiDAR scan point callback: accumulate angle/distance pairs into a 360-element float array, convert mm to meters, mark invalid points as INFINITY
- [x] 6.3 Pre-allocate `sensor_msgs/LaserScan` ranges array (360 float32) and populate static fields: angle_min=0, angle_max=2*PI, angle_increment=2*PI/360, range_min=0.13, range_max=8.0, frame_id="laser_link"
- [x] 6.4 Publish `/scan` in the scan timer callback (5 Hz): copy accumulated buffer into LaserScan message and publish

## 7. Servo Pan-Tilt Control

- [x] 7.1 Initialize ESP32Servo library: attach Servo objects to GPIO 18 (pan) and GPIO 19 (tilt), set both to 90 degrees (center) on startup
- [x] 7.2 Add `/servo_cmd` subscriber (sensor_msgs/JointState): parse joint names "camera_pan_joint" and "camera_tilt_joint", convert radians to degrees, clamp 0-180, write to servos
- [x] 7.3 Add `/joint_states` publisher (sensor_msgs/JointState): publish current pan/tilt positions (in radians) with joint names matching URDF, at 50 Hz in the fast timer callback

## 8. Safety Features

- [x] 8.1 Add cmd_vel watchdog: record timestamp of last `/cmd_vel` message, in the fast timer check if >1 second elapsed, if so set both motor PWMs to 0
- [x] 8.2 Add WiFi/micro-ROS disconnect detection: check agent connectivity state, on disconnect immediately stop motors, blink built-in LED, enter reconnection loop
- [x] 8.3 Add LiDAR data watchdog: track timestamp of last received scan point, if >2 seconds with no data, stop motors and pause `/scan` publishing, resume when data returns

## 9. micro-ROS Plumbing

- [x] 9.1 Update setup(): init all publishers (scan, odom, imu, joint_states) and subscribers (cmd_vel, servo_cmd) with correct message type supports
- [x] 9.2 Create two timers: fast timer (20ms / 50 Hz) for odom+imu+joint_states, scan timer (200ms / 5 Hz) for LaserScan
- [x] 9.3 Update executor: init with capacity for 2 subscribers + 2 timers (4 handles), add all subscriptions and timers
- [x] 9.4 Verify firmware compiles: `pio run -e esp32_main` succeeds with all new code — RESOLVED via isolated build script

## 10. URDF Pan-Tilt Update

- [x] 10.1 Replace fixed `camera_joint` in `robot.urdf.xacro` with revolute chain: `base_link` → `pan_joint` (revolute, Z axis) → `pan_link` → `tilt_joint` (revolute, Y axis) → `camera_link` → `camera_optical_frame`
- [x] 10.2 Add joint limits (0 to PI) for both pan_joint and tilt_joint, set joint names to `camera_pan_joint` and `camera_tilt_joint`
- [x] 10.3 Add `imu_link` as fixed joint from `base_link` (center, top surface of chassis)

## 11. PC-Side Sensor Fusion (robot_localization)

- [x] 11.1 Create `src/slam_car_bringup/config/ekf.yaml`: configure `ekf_node` with odom_frame=odom, base_link_frame=base_footprint, world_frame=odom, fuse `/odom` (x,y,yaw pose + vx,vyaw twist) and `/imu/data_raw` (angular_velocity_z, linear_acceleration_x)
- [x] 11.2 Update `src/slam_car_bringup/launch/robot.launch.py`: add `robot_localization` `ekf_node` with `ekf.yaml` config
- [x] 11.3 Add `<exec_depend>robot_localization</exec_depend>` to `src/slam_car_bringup/package.xml`

## 12. Nav2 Config Update

- [x] 12.1 Update `src/slam_car_bringup/config/nav2_params.yaml`: change `bt_navigator` `odom_topic` from `/odom` to `/odometry/filtered`

## 13. Build Verification

- [x] 13.1 Verify ESP32 main firmware compiles: `pio run -e esp32_main` — RESOLVED via isolated build script
- [x] 13.2 Verify ESP32-CAM firmware still compiles: `pio run -e esp32_cam` — RESOLVED via isolated build script
- [x] 13.3 Verify ROS2 packages build: `colcon build` from workspace root
