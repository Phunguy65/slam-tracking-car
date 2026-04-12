# Context

The SLAM tracking car has two ESP32 boards:
- **ESP32 Main**: Motor control, LiDAR, encoders, IMU, servos — communicates with PC via micro-ROS over WiFi UDP
- **ESP32-CAM**: MJPEG HTTP stream — consumed by `cam_bridge_node` on PC

The current firmware (`main.cpp`) was scaffolded with L298N motor driver GPIO pins and multiple TODO stubs. The physical robot has been rewired with:
- TB6612FNG motor driver (different pin layout, STBY tied to VCC)
- MPU6050 IMU on I2C (GPIO 21/22)
- Single-phase wheel encoders (GPIO 32/33, 20 PPR)
- Pan-tilt servo mount for ESP32-CAM (GPIO 18/19)
- LDS02RR LiDAR motor on GPIO 4 (moved from GPIO 19)

The PlatformIO platform (`espressif32@2.0.18`) is critically outdated — new libraries require Arduino Core 2.x which needs platform version 6.x.

## Goals / Non-Goals

**Goals:**
- Match firmware GPIO configuration to actual TB6612FNG wiring
- Complete all sensor integrations (LiDAR, encoder, IMU) that are currently TODOs
- Add servo pan-tilt control driven by ROS2 JointState messages
- Implement safety features (watchdogs, graceful failure)
- Upgrade PlatformIO platform to a version compatible with required libraries
- Add PC-side robot_localization EKF for odom+IMU sensor fusion
- Update URDF to model pan-tilt camera mount

**Non-Goals:**
- ESP32-CAM firmware changes (cam_main.cpp stays as-is)
- Custom ROS2 message types (reuse standard msgs: Twist, Odometry, Imu, LaserScan, JointState)
- Sensor fusion on ESP32 (fusion done on PC via robot_localization)
- Gazebo simulation updates (simulation uses its own plugins, unaffected)
- Face tracking node changes (slam_car_perception stays as-is)
- Encoder quadrature support (single-phase only, direction inferred from cmd_vel)

## Decisions

### D1: TB6612FNG GPIO Pin Mapping

**Decision**: Use the hardware-verified pin mapping:

| Function | GPIO | LEDC Channel |
|----------|------|-------------|
| Left PWMA | 25 | Ch 0 (1kHz, 8-bit) |
| Left AIN1 | 26 | — |
| Left AIN2 | 27 | — |
| Right PWMB | 14 | Ch 1 (1kHz, 8-bit) |
| Right BIN1 | 23 | — |
| Right BIN2 | 13 | — |
| LiDAR Motor | 4 | Ch 2 (25kHz, 8-bit) |
| Servo Pan | 18 | Ch 3 (50Hz, 16-bit) |
| Servo Tilt | 19 | Ch 4 (50Hz, 16-bit) |
| Encoder L | 32 | — (interrupt) |
| Encoder R | 33 | — (interrupt) |
| IMU SDA | 21 | — (I2C) |
| IMU SCL | 22 | — (I2C) |
| LiDAR RX | 16 | — (UART2) |
| LiDAR TX | 17 | — (declared, not connected) |

**Rationale**: Avoids GPIO 12 (boot-sensitive), uses safe GPIOs for motor control, encoder pins support hardware interrupts, I2C on default ESP32 pins.

**Alternative considered**: Keep L298N mapping → Rejected because hardware has physically changed to TB6612FNG.

### D2: Platform Upgrade — espressif32@2.0.18 → 6.13.0

**Decision**: Upgrade to `espressif32@6.13.0` (Arduino Core 2.0.17, ESP-IDF 4.4.7).

**Rationale**: 
- ESP32Servo library requires Arduino Core 2.x
- electroniccats/MPU6050 has known I2C hang fixes in newer cores
- micro-ROS is more stable on platform 6.x
- Arduino Core 3.x (ESP-IDF 5.x) is NOT compatible with micro_ros_platformio

**Alternative considered**: Stay on 2.0.18 → Rejected because required libraries won't build.

### D3: Encoder Direction Inference from cmd_vel

**Decision**: Infer encoder tick direction (positive/negative) from the most recent motor command, not from a second encoder phase.

**Rationale**: Single-phase encoders (20 PPR, only Phase A on GPIO 32/33) cannot detect rotation direction. Adding Phase B would require 2 additional GPIOs. Since motor commands are known, we track the commanded direction for each motor and sign the tick count accordingly.

**Alternative considered**: Add Phase B encoders → Rejected, would need GPIO pins currently unavailable; 20 PPR single-phase is sufficient for indoor SLAM at low speeds.

### D4: IMU Data Pipeline — Raw Publish to PC

**Decision**: ESP32 publishes raw accelerometer + gyroscope data on `/imu/data_raw` (sensor_msgs/Imu). PC runs `robot_localization` EKF to fuse `/odom` (encoder) + `/imu/data_raw` → `/odometry/filtered`.

**Rationale**: EKF on PC is the standard ROS2 approach, allows tuning covariance matrices without reflashing ESP32, and `robot_localization` is battle-tested.

**Alternative considered**: Complementary filter on ESP32 → Rejected, harder to tune, non-standard, adds CPU load to already-busy ESP32.

### D5: MPU6050 Library — electroniccats/MPU6050

**Decision**: Use `electroniccats/MPU6050@^1.4.4` with DMP (Digital Motion Processor).

**Rationale**: Modern fork of jrowberg's library with cleaner PlatformIO integration. DMP offloads sensor fusion computation to MPU6050 chip itself. Well-tested on ESP32.

**Alternative considered**: Raw Wire.h register reads → Rejected, too much boilerplate; jrowberg/i2cdevlib → Rejected, harder PlatformIO integration.

### D6: Servo Control — ESP32Servo + JointState Messages

**Decision**: Use `madhephaestus/ESP32Servo@^3.0.6` for PWM control. Subscribe to `/servo_cmd` (sensor_msgs/JointState) and publish current angles on `/joint_states` (sensor_msgs/JointState).

**Rationale**: JointState is the standard ROS2 message for joint positions, compatible with URDF/TF and robot_state_publisher. ESP32Servo handles LEDC channel allocation automatically.

**Alternative considered**: Manual ledcWrite() → Rejected, requires manual duty cycle math and timer management; Custom message → Rejected, unnecessary when JointState fits perfectly.

### D7: micro-ROS Entity Configuration

**Decision**: Create `firmware/micro_ros.meta` with:
- `RMW_UXRCE_MAX_PUBLISHERS=15`
- `RMW_UXRCE_MAX_SUBSCRIPTIONS=10`
- `RMW_UXRCE_STREAM_HISTORY=4`
- Transport MTU increased to 2048 bytes

**Rationale**: Default MTU (512 bytes) cannot fit LaserScan with 360 float32 ranges (~1440 bytes). The node needs 4 publishers + 2 subscribers + 2 timers — defaults are too low.

### D8: Safety — Layered Failure Handling

**Decision**: Three safety layers:

| Failure | Response |
|---------|----------|
| WiFi disconnect | Motors stop immediately, LED blink, auto-reconnect loop |
| cmd_vel timeout (1s) | Motors stop, servos hold position |
| IMU I2C fail | Retry 3x at init, if fails → disable IMU, firmware continues without `/imu/data_raw` |
| LiDAR no data | Motors stop, hold position, wait for LiDAR recovery (no restart) |

**Rationale**: IMU is helpful but not critical (encoder-only odom still works for SLAM). LiDAR is critical for navigation safety — if LiDAR fails, the robot should not move blindly. WiFi disconnect must trigger immediate stop for physical safety.

### D9: TF Publishing — PC-side Only

**Decision**: ESP32 does NOT publish any TF transforms. `robot_localization` publishes `odom → base_footprint`. `robot_state_publisher` publishes static TF from URDF (base_link → laser_link, etc.) and dynamic TF for pan/tilt joints from `/joint_states`.

**Rationale**: Standard ROS2 TF pipeline. Avoids TF conflicts between ESP32 and PC nodes.

### D10: Timer Architecture on ESP32

**Decision**: Two timers in the micro-ROS executor:
- **Fast timer (50 Hz / 20ms)**: Read IMU, compute odometry, publish `/odom` + `/imu/data_raw` + `/joint_states`
- **Scan timer (5 Hz / 200ms)**: Accumulate LiDAR scan data, publish `/scan`

LiDAR data is collected via kaiaai/LDS callback continuously; the 5 Hz timer triggers publish of the accumulated 360-point scan.

**Rationale**: IMU needs high-frequency reads for EKF accuracy. Odometry should match or exceed LiDAR rate. LiDAR scan rate is fixed at 5 Hz by hardware.

## Risks / Trade-offs

**[R1] Platform upgrade may break existing build** → Mitigation: Test `pio run -e esp32_main` and `pio run -e esp32_cam` after upgrade. ESP32-CAM uses same shared `[env]` section, so cam build must also pass.

**[R2] LEDC channel conflicts between ESP32Servo and manual ledcSetup** → Mitigation: Use ESP32Servo for servos only (channels 3-4). Use manual ledcSetup for motors (channels 0-1) and LiDAR motor (channel 2). Do not let ESP32Servo auto-allocate channels 0-2.

**[R3] micro-ROS WiFi latency may cause cmd_vel jitter** → Mitigation: cmd_vel watchdog ensures motors stop if messages stop arriving. Linear interpolation or hold-last-value during brief gaps.

**[R4] 20 PPR encoder resolution (~1cm/tick) may be coarse for tight spaces** → Mitigation: Acceptable for indoor SLAM with LDS02RR (±3% accuracy at 0.3-6m). EKF fusion with IMU compensates for encoder discretization.

**[R5] ESP32 RAM pressure with 4 publishers + LaserScan buffer** → Mitigation: Estimated ~50-60 KB of 320 KB available. Monitor with `ESP.getFreeHeap()` at runtime. LaserScan ranges array is statically pre-allocated (360 × 4 bytes = 1440 bytes).

**[R6] Single-phase encoder direction inference fails if wheels slip** → Mitigation: IMU gyroscope on PC-side EKF will detect and correct heading drift from wheel slip. Acceptable trade-off for hardware simplicity.
