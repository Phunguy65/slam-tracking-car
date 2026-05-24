# ADDED Requirements

## Requirement: Module Separation

The firmware SHALL be organized into separate modules, each handling a single hardware subsystem or logical concern. Each module SHALL have a corresponding header file in `include/` and implementation file in `src/`.

### Scenario: All modules present after refactor

- **WHEN** the refactor is complete
- **THEN** the following files SHALL exist:
  - `include/motors.h` + `src/motors.cpp`
  - `include/encoders.h` + `src/encoders.cpp`
  - `include/imu.h` + `src/imu.cpp`
  - `include/lidar.h` + `src/lidar.cpp`
  - `include/servos.h` + `src/servos.cpp`
  - `include/safety.h` + `src/safety.cpp`
  - `include/ros_bridge.h` + `src/ros_bridge.cpp`

### Scenario: Main.cpp is minimal

- **WHEN** the refactor is complete
- **THEN** `src/main.cpp` SHALL contain only `setup()` and `loop()` functions with module initialization calls and SHALL be less than 100 lines

## Requirement: State Encapsulation

Each module SHALL encapsulate its internal state using static variables. External access to module state SHALL be provided through getter functions.

### Scenario: No extern volatile globals

- **WHEN** inspecting any header file
- **THEN** there SHALL be no `extern volatile` variable declarations

### Scenario: Encoder state access via getters

- **WHEN** another module needs odometry data
- **THEN** it SHALL call `encoders_get_x()`, `encoders_get_y()`, `encoders_get_theta()` functions instead of accessing global variables directly

### Scenario: Motor direction access for ISR

- **WHEN** encoder ISR needs motor direction to determine tick sign
- **THEN** it SHALL call `motors_get_left_dir()` or `motors_get_right_dir()` functions

## Requirement: ROS Bridge Centralization

The `ros_bridge` module SHALL own all micro-ROS entities (publishers, subscribers, timers, executor). Other modules SHALL NOT include micro-ROS headers.

### Scenario: Hardware modules are ROS-agnostic

- **WHEN** inspecting `motors.cpp`, `encoders.cpp`, `imu.cpp`, `lidar.cpp`, `servos.cpp`, or `safety.cpp`
- **THEN** there SHALL be no includes of `<rcl/*.h>`, `<rclc/*.h>`, or `<*_msgs/*.h>` headers

### Scenario: Timer callbacks in ros_bridge

- **WHEN** the fast timer (50Hz) fires
- **THEN** `ros_bridge.cpp` SHALL call update functions from other modules and publish messages

### Scenario: Subscriber callbacks in ros_bridge

- **WHEN** a `/cmd_vel` message is received
- **THEN** `ros_bridge.cpp` SHALL call `motors_apply_cmd_vel()` to apply the command

## Requirement: Unit Test Support

Each module SHALL support host-based unit testing by guarding Arduino-specific hardware calls with `#ifndef UNIT_TEST` preprocessor directives.

### Scenario: Module compiles without Arduino

- **WHEN** compiling with `-DUNIT_TEST` flag
- **THEN** all modules SHALL compile successfully without Arduino.h or ESP32-specific headers

### Scenario: Logic is testable

- **WHEN** testing odometry computation
- **THEN** `encoders_update_odometry()` SHALL execute its kinematics calculations regardless of `UNIT_TEST` flag

## Requirement: Header Guard Convention

All header files SHALL use traditional `#ifndef`/`#define`/`#endif` header guards with the pattern `<MODULE>_H_`.

### Scenario: Consistent header guards

- **WHEN** inspecting any new header file
- **THEN** it SHALL start with `#ifndef <MODULE>_H_` followed by `#define <MODULE>_H_` and end with `#endif // <MODULE>_H_`

## Requirement: No Circular Dependencies

Module dependencies SHALL follow a strict layered architecture with no circular includes.

### Scenario: Dependency layers respected

- **WHEN** analyzing include directives
- **THEN** the following dependency order SHALL hold:
  - Layer 0: `config.h` (no dependencies)
  - Layer 1: `motors.h`, `imu.h`, `lidar.h`, `servos.h` (depend only on config.h)
  - Layer 2: `encoders.h` (depends on config.h, motors.h)
  - Layer 3: `safety.h` (depends on config.h, motors.h, lidar.h)
  - Layer 4: `ros_bridge.h` (depends on all above)

## Requirement: Behavioral Equivalence

The refactored firmware SHALL produce identical runtime behavior to the original monolithic implementation.

### Scenario: ROS topics unchanged

- **WHEN** the refactored firmware is running
- **THEN** it SHALL publish to the same topics (`/scan`, `/odom`, `/imu/data_raw`, `/joint_states`) with the same message types and frequencies

### Scenario: Subscriber behavior unchanged

- **WHEN** `/cmd_vel` or `/servo_cmd` messages are received
- **THEN** the robot SHALL respond identically to the original implementation

### Scenario: Safety watchdogs unchanged

- **WHEN** `/cmd_vel` messages stop for more than `CMD_VEL_TIMEOUT_MS`
- **THEN** motors SHALL stop, identical to original behavior
