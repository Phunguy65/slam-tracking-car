## [2026-04-13] Round 1 (from opsx-apply auto-verify)

### opsx-arch-verifier
- Fixed: W1 - Moved `SCAN_POINTS` constant from duplicate definitions in `lidar.cpp` and `ros_bridge.cpp` to single definition in `config.h`
- Fixed: W2 - Moved `LED_PIN` constant to `config.h` as `LED_STATUS_PIN`, updated all usages in `main.cpp` and `ros_bridge.cpp`
- Fixed: W3 - Removed dead `safety_notify_lidar_data()` function from `safety.h` and `safety.cpp` (LiDAR module self-notifies via `lidar_notify_data()`)
- Fixed: W4 - Removed unnecessary `#ifndef UNIT_TEST` guards around `math.h` includes in `encoders.cpp`, `imu.cpp`, `servos.cpp`, `lidar.cpp`, `ros_bridge.cpp`; added `PI` fallback definition in `config.h` for unit test builds
