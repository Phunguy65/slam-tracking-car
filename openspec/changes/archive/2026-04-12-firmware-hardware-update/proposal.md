# Why

The current ESP32 firmware (`firmware/src/main.cpp` + `config.h`) was scaffolded with placeholder GPIO pins (L298N motor driver) and multiple unimplemented TODOs (LiDAR integration, encoder odometry, IMU). The physical robot has been rewired with new hardware: TB6612FNG motor driver, MPU6050 IMU, wheel encoders, and a servo pan-tilt camera mount. The firmware must be updated to match the actual hardware, complete all sensor integrations, and establish proper ROS2 topic communication. Additionally, the PlatformIO platform version (`espressif32@2.0.18`) is critically outdated and incompatible with required libraries.

## What Changes

- **BREAKING**: Replace L298N GPIO pin mapping with TB6612FNG pin mapping across all motor control code
- **BREAKING**: Upgrade PlatformIO platform from `espressif32@2.0.18` to `espressif32@6.13.0`
- Complete LDS02RR LiDAR integration via kaiaai/LDS library (currently TODO stubs)
- Add wheel encoder odometry using hardware interrupts (GPIO 32/33, 20 PPR single-phase)
- Add MPU6050 IMU raw data publishing over I2C (GPIO 21/22)
- Add servo pan-tilt control via JointState messages (GPIO 18/19)
- Add micro-ROS custom meta file for increased MTU (2048 bytes) and entity limits
- Add safety features: WiFi disconnect motor stop, cmd_vel 1s watchdog, graceful IMU/LiDAR failure handling
- Update URDF to replace fixed camera joint with pan-tilt revolute joints
- Add robot_localization EKF node for odom+IMU sensor fusion on PC side
- Update launch files and Nav2 config to use fused odometry (`/odometry/filtered`)

## Capabilities

### New Capabilities

- `esp32-gpio-config`: GPIO pin mapping for TB6612FNG, encoders, IMU, servo pan-tilt, and LiDAR — single source of truth in `config.h`
- `encoder-odometry`: Wheel encoder ISR-based tick counting, differential drive odometry calculation, `/odom` publishing
- `imu-integration`: MPU6050 I2C driver init, raw accelerometer+gyroscope reading, `/imu/data_raw` publishing, graceful failure handling
- `servo-pan-tilt`: Dual servo control via `/servo_cmd` (JointState), state feedback via `/joint_states`, ESP32Servo library integration
- `lidar-scan-publish`: Full LDS02RR integration via kaiaai/LDS — scan data parsing, motor PID, `/scan` LaserScan publishing
- `firmware-safety`: WiFi disconnect detection with motor stop, cmd_vel watchdog (1s timeout), LiDAR failure halt, IMU failure degraded mode
- `sensor-fusion-ekf`: PC-side robot_localization EKF config fusing `/odom` + `/imu/data_raw` → `/odometry/filtered` + TF `odom→base_footprint`
- `urdf-pan-tilt`: URDF update replacing fixed camera joint with pan/tilt revolute joints driven by `/joint_states`

### Modified Capabilities

<!-- No existing specs to modify — openspec/specs/ is empty -->

## Impact

**Firmware files (ESP32):**
- `firmware/include/config.h` — Full rewrite of GPIO defines, add encoder/IMU/servo constants
- `firmware/include/config.h.example` — Mirror config.h changes
- `firmware/src/main.cpp` — Major rewrite: new motor pins, add encoder ISR, IMU driver, LiDAR integration, servo control, safety watchdogs, expanded micro-ROS plumbing (4 pub + 2 sub + 2 timers)
- `firmware/platformio.ini` — Platform upgrade + new lib_deps (MPU6050, ESP32Servo) + custom meta reference
- `firmware/micro_ros.meta` — New file for micro-ROS entity limits and MTU config

**ROS2 PC-side files:**
- `src/slam_car_bringup/urdf/robot.urdf.xacro` — Replace fixed camera_joint with pan_joint + tilt_joint revolute chain
- `src/slam_car_bringup/launch/robot.launch.py` — Add robot_localization EKF node
- `src/slam_car_bringup/config/ekf.yaml` — New config for robot_localization
- `src/slam_car_bringup/package.xml` — Add robot_localization dependency
- `src/slam_car_bringup/config/nav2_params.yaml` — Update odom_topic references to `/odometry/filtered`

**Dependencies added:**
- `electroniccats/MPU6050 @ ^1.4.4` (PlatformIO)
- `madhephaestus/ESP32Servo @ ^3.0.6` (PlatformIO)
- `robot_localization` (ROS2 apt package)

**No changes to:**
- `firmware/src/cam_main.cpp` (ESP32-CAM firmware)
- `src/slam_car_perception/` (face tracking nodes)
- `src/slam_car_interfaces/` (custom messages)
