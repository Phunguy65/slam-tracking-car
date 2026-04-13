# Why

The ESP32 main firmware (`firmware/src/main.cpp`) has grown to 806 lines, containing all functionality in a single file: motor control, encoders, odometry, IMU, LiDAR, servos, safety watchdogs, and micro-ROS communication. This monolithic structure makes it difficult to:
- Understand individual subsystems in isolation
- Test components without hardware
- Modify one subsystem without risk of breaking others
- Onboard new contributors

Refactoring now, before adding more features, prevents further technical debt accumulation.

## What Changes

- Split `main.cpp` into 8 focused modules with clear interfaces
- Encapsulate hardware state behind getter/setter functions (no more `extern volatile` globals)
- Centralize micro-ROS publishers/subscribers in `ros_bridge` module
- Add `#ifdef UNIT_TEST` guards to enable host-based testing without hardware
- Reduce `main.cpp` to ~50 lines (setup/loop orchestration only)

## Capabilities

### New Capabilities

- `firmware-modules`: Modular firmware architecture with separated concerns (motors, encoders, IMU, LiDAR, servos, safety, ros_bridge)

### Modified Capabilities

<!-- No existing specs are being modified - this is a pure refactor with no behavior changes -->

## Impact

- **Code**: `firmware/src/main.cpp` (806 lines) → 8 source files + 7 headers
- **Build**: `platformio.ini` unchanged (PlatformIO auto-discovers .cpp files in src/)
- **APIs**: Internal only - no changes to ROS topics, messages, or external interfaces
- **Testing**: Enables future unit testing with hardware mocks
- **Risk**: Low - pure refactor, all existing functionality preserved
