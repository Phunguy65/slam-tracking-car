# Tasks

## 1. Create Module Headers

- [x] 1.1 Create `include/motors.h` with function declarations: `motors_init()`, `motors_stop()`, `motors_apply_cmd_vel()`, `motors_get_left_dir()`, `motors_get_right_dir()`
- [x] 1.2 Create `include/encoders.h` with function declarations: `encoders_init()`, `encoders_update_odometry()`, getters for x/y/theta/linear_vel/angular_vel
- [x] 1.3 Create `include/imu.h` with function declarations: `imu_init()`, `imu_is_enabled()`, `imu_read()`, getters for accel/gyro xyz
- [x] 1.4 Create `include/lidar.h` with function declarations: `lidar_init()`, `lidar_loop()`, `lidar_is_active()`, `lidar_is_scan_ready()`, `lidar_get_ranges()`, `lidar_clear_scan_ready()`
- [x] 1.5 Create `include/servos.h` with function declarations: `servos_init()`, `servos_set_pan()`, `servos_set_tilt()`, `servos_get_pan()`, `servos_get_tilt()`
- [x] 1.6 Create `include/safety.h` with function declarations: `safety_init()`, `safety_check()`, `safety_notify_cmd_vel()`, `safety_notify_lidar_data()`, `safety_is_motion_allowed()`
- [x] 1.7 Create `include/ros_bridge.h` with function declarations: `ros_bridge_init()`, `ros_bridge_spin()`

## 2. Extract Motor Module

- [x] 2.1 Create `src/motors.cpp` with static direction variables and TB6612FNG pin setup
- [x] 2.2 Move `setup_motors()` logic to `motors_init()` with `#ifndef UNIT_TEST` guards
- [x] 2.3 Move `stop_motors()` and `apply_cmd_vel()` logic with `#ifndef UNIT_TEST` guards around GPIO/PWM calls
- [x] 2.4 Implement `motors_get_left_dir()` and `motors_get_right_dir()` getters

## 3. Extract Encoder Module

- [x] 3.1 Create `src/encoders.cpp` with static encoder tick counters and odometry state
- [x] 3.2 Move encoder ISRs (`encoder_left_isr`, `encoder_right_isr`) - call `motors_get_*_dir()` for direction
- [x] 3.3 Move `setup_encoders()` logic to `encoders_init()` with `#ifndef UNIT_TEST` guards
- [x] 3.4 Move `compute_odometry()` logic to `encoders_update_odometry()` - kinematics runs always, critical section guarded
- [x] 3.5 Implement odometry getters: `encoders_get_x()`, `encoders_get_y()`, `encoders_get_theta()`, `encoders_get_linear_vel()`, `encoders_get_angular_vel()`

## 4. Extract IMU Module

- [x] 4.1 Create `src/imu.cpp` with static MPU6050 instance and accel/gyro state
- [x] 4.2 Move `setup_imu()` logic to `imu_init()` with `#ifndef UNIT_TEST` guards
- [x] 4.3 Move `read_imu()` logic to `imu_read()` - store converted values in static vars
- [x] 4.4 Implement `imu_is_enabled()` and accel/gyro getters

## 5. Extract LiDAR Module

- [x] 5.1 Create `src/lidar.cpp` with static LDS02RR instance, scan buffer, and flags
- [x] 5.2 Move `setup_lidar()` logic to `lidar_init()` with `#ifndef UNIT_TEST` guards
- [x] 5.3 Move LiDAR callbacks (`lidar_scan_point_cb`, `lidar_motor_pin_cb`, `lidar_serial_*_cb`)
- [x] 5.4 Implement `lidar_loop()` wrapper, `lidar_is_active()`, `lidar_is_scan_ready()`, `lidar_get_ranges()`, `lidar_clear_scan_ready()`

## 6. Extract Servo Module

- [x] 6.1 Create `src/servos.cpp` with static Servo instances and position state
- [x] 6.2 Move `setup_servos()` logic to `servos_init()` with `#ifndef UNIT_TEST` guards
- [x] 6.3 Implement `servos_set_pan()`, `servos_set_tilt()` with radians-to-degrees conversion
- [x] 6.4 Implement `servos_get_pan()`, `servos_get_tilt()` getters

## 7. Extract Safety Module

- [x] 7.1 Create `src/safety.cpp` with static watchdog timestamps and flags
- [x] 7.2 Move `check_safety()` logic - call `motors_stop()` and `lidar_is_active()` check
- [x] 7.3 Implement `safety_notify_cmd_vel()`, `safety_notify_lidar_data()` to reset watchdog timers
- [x] 7.4 Implement `safety_is_motion_allowed()` to check if watchdogs are satisfied

## 8. Extract ROS Bridge Module

- [x] 8.1 Create `src/ros_bridge.cpp` with static micro-ROS entities (allocator, support, node, executor, publishers, subscribers, timers)
- [x] 8.2 Move message pre-allocation logic from `setup_messages()`
- [x] 8.3 Move `setup_micro_ros()` logic to `ros_bridge_init()` - includes WiFi transport setup
- [x] 8.4 Move `fast_timer_callback()` - call module update functions and publish odom/IMU/joint_states
- [x] 8.5 Move `scan_timer_callback()` - call `lidar_get_ranges()` and publish scan
- [x] 8.6 Move `cmd_vel_callback()` - call `safety_notify_cmd_vel()` and `motors_apply_cmd_vel()`
- [x] 8.7 Move `servo_cmd_callback()` - call `servos_set_pan/tilt()`
- [x] 8.8 Implement `ros_bridge_spin()` wrapper around `rclc_executor_spin_some()`

## 9. Slim Down main.cpp

- [x] 9.1 Remove all extracted code from `main.cpp`
- [x] 9.2 Add includes for all module headers
- [x] 9.3 Update `setup()` to call module init functions in order: motors, encoders, imu, lidar, servos, safety, ros_bridge
- [x] 9.4 Update `loop()` to call `lidar_loop()` and `ros_bridge_spin()`
- [x] 9.5 Remove forward declarations that are now in headers

## 10. Verification

- [x] 10.1 Build with `pio run -e esp32_main` - verify no compile errors
- [ ] 10.2 Check binary size is within ~5% of original (current: 874,921 bytes Flash, 87,004 bytes RAM)
- [ ] 10.3 Flash to hardware and verify `/scan`, `/odom`, `/imu/data_raw`, `/joint_states` topics publish correctly
- [ ] 10.4 Verify `/cmd_vel` and `/servo_cmd` subscribers work correctly
- [ ] 10.5 Verify safety watchdogs trigger on cmd_vel timeout
