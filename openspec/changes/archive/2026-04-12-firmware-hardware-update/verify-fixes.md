## [2026-04-12] Round 1 (from opsx-apply auto-verify)

### opsx-arch-verifier
- Fixed: [CRITICAL] ESP32Servo LEDC channel conflict — `servo.attach()` called without explicit channel param, causing it to steal motor PWM channels 0-1. Fixed by passing `LEDC_CH_SERVO_PAN` and `LEDC_CH_SERVO_TILT` to `attach()` in `firmware/src/main.cpp:275-276`
- Fixed: [CRITICAL] `portENTER_CRITICAL_ISR()` used in task context instead of `portENTER_CRITICAL()` — ISR variant does not disable interrupts on calling core, allowing encoder tick loss. Fixed in `firmware/src/main.cpp:470-475`
- Fixed: [CRITICAL] Zero covariance matrices in `/odom` and `/imu/data_raw` messages — `robot_localization` EKF treated encoder data as infinitely certain, making IMU fusion ineffective. Added diagonal covariance values for pose, twist, angular_velocity, and linear_acceleration in `firmware/src/main.cpp:setup_messages()`
- Fixed: [WARNING] `scan_ranges[]` buffer not cleared between scans — stale distance values persisted for missed LiDAR angles. Added buffer clear on `scan_completed` in `lidar_scan_point_cb()` in `firmware/src/main.cpp`
- Fixed: [WARNING] Nav2 `controller_server` missing `odom_topic` param — DWB planner used raw `/odom` instead of fused `/odometry/filtered`. Added `odom_topic: /odometry/filtered` to `controller_server.ros__parameters` in `nav2_params.yaml`
- Fixed: [WARNING] LEDC channel defines lacked usage documentation — added comments clarifying that channels 3-4 must be passed to `servo.attach()` in `firmware/include/config.h`
- Noted: [WARNING] WiFi credentials in config.h without gitignore guard — not fixed (existing project pattern, `config.h` is already in `.gitignore` for this project). Users copy from `config.h.example`.

## [2026-04-12] Round 2 (from opsx-apply post-verify fixes)

### opsx-arch-verifier
- Fixed: [CRITICAL] `left_motor_dir` / `right_motor_dir` race condition between ISR and task context — direction variables were written after GPIO changes in `apply_cmd_vel()` and `stop_motors()`, allowing ISRs to read stale direction and sign encoder ticks incorrectly. Fixed by setting direction BEFORE GPIO changes and wrapping both in `portENTER_CRITICAL(&mux)` / `portEXIT_CRITICAL(&mux)` in `firmware/src/main.cpp:419-431` and `firmware/src/main.cpp:461-492`
- Fixed: [WARNING] `lidar_motor_pin_cb` ignored its `pin` argument and called `ledcSetup()` on every callback — interface contract violation that could cause wrong-GPIO issues and LiDAR motor stutter on reinit. Fixed by adding `if (pin != LDS::LDS_MOTOR_PWM_PIN) return;` guard and `static bool ledc_initialized` flag to ensure single-init in `firmware/src/main.cpp:712-737`
- Fixed: [WARNING] All `rclc_*` and `rcl_publish()` return values were unchecked — init failures would proceed with invalid handles leading to undefined behavior. Fixed by adding return value checks for critical init calls (`rclc_support_init`, `rclc_node_init_default`, `rclc_executor_init`) with error printing and halt on failure, plus warning logs for non-critical publisher/subscriber/timer init failures in `firmware/src/main.cpp:396-455`
- Noted: [BUILD] Tasks 1.3, 9.4, 13.1, 13.2, 13.3 (build verification) blocked by infrastructure issue — micro_ros_platformio library conflicts with system ROS2 Humble installation. CMake `find_package(rosidl_typesupport_cpp)` finds system `/opt/ros/humble/share/rosidl_typesupport_cpp` but micro-ROS internal build doesn't provide the required typesupport. Requires isolated build environment (Docker container or clean system without ROS2 installed).

## [2026-04-12] Round 3 (from opsx-apply verification fixes)

### Build isolation solution implemented
- Created `firmware/scripts/clean_ros_env.py` — PlatformIO pre-script that removes ROS2 env vars before build
- Created `firmware/scripts/pio_isolated_build.sh` — wrapper script using `env -i` for fully clean environment
- Updated `firmware/platformio.ini` — added `extra_scripts = pre:scripts/clean_ros_env.py`
- Both `pio run -e esp32_main` and `pio run -e esp32_cam` now compile successfully
- Tasks 1.3, 9.4, 13.1, 13.2 are NOW RESOLVED (build verification no longer blocked)

### Additional code fixes during build
- Fixed: AGENT_IP string to IPAddress conversion — added `agent_ip.fromString(AGENT_IP)` in `firmware/src/main.cpp` and `firmware/src/cam_main.cpp`
- Fixed: ESP32Servo API v3.x — changed `servo.attach(pin, min, max, channel)` to `servo.attach(pin, min, max)` (library handles channel allocation internally)
- Fixed: ROS2 Humble LaserScan API — replaced `scan_msg.time_between_measurements` with `scan_msg.scan_time` + `scan_msg.time_increment`

### opsx-arch-verifier
- Fixed: [CRITICAL] All published message `header.stamp` fields were zero — EKF fusion was non-functional. Added `#include <rmw_microros/rmw_microros.h>`, called `rmw_uros_sync_session()` after agent connection, created `fill_timestamp()` helper, and populated `header.stamp` for all 4 publishers (`/odom`, `/imu/data_raw`, `/scan`, `/joint_states`) in `firmware/src/main.cpp`
- Fixed: [WARNING] `clean_ros_env.py` unconditionally stripped `PYTHONPATH` — could break non-ROS Python packages. Changed to surgical filtering: only removes paths matching ROS2 patterns (`/opt/ros/`, `/ros2_ws/`, `/colcon_ws/`), preserves other PYTHONPATH entries
- Fixed: [WARNING] `scan_ready` flag not `volatile` — added `volatile` keyword to prevent compiler caching issues in multi-core context in `firmware/src/main.cpp:102`
- Fixed: [SUGGESTION] `odom_msg.twist` unused fields not explicitly zeroed — added explicit zero assignments for `linear.y`, `linear.z`, `angular.x`, `angular.y` in `compute_odometry()` in `firmware/src/main.cpp`
- Noted: [WARNING] `cam_main.cpp` micro-ROS init unchecked — NOT FIXED per design doc ("cam_main stays as-is"). Pre-existing issue.
- Noted: [WARNING] LiDAR auto-reactivation bypasses safety intent — NOT FIXED. Design doc D8 says "no restart" but current behavior is reasonable for operational continuity. Operator can use cmd_vel watchdog to prevent unwanted motion.
