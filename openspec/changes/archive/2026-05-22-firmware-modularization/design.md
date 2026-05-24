# Context

The ESP32 main firmware is a monolithic 806-line file that handles:
- Motor control (TB6612FNG driver)
- Wheel encoder ISRs + odometry computation
- IMU reading (MPU6050)
- LiDAR data collection (LDS02RR)
- Servo pan-tilt control
- Safety watchdogs (cmd_vel timeout, LiDAR timeout)
- micro-ROS communication (4 publishers, 2 subscribers, 2 timers)

All state is global, making it impossible to test individual components or reason about data flow.

## Goals / Non-Goals

**Goals:**

- Split into 8 focused modules with single responsibilities
- Encapsulate state behind getter/setter functions
- Enable host-based unit testing via `#ifdef UNIT_TEST` mocks
- Maintain identical runtime behavior (pure refactor)
- Keep compile-time and binary size similar

**Non-Goals:**

- Adding new features or changing ROS topic interfaces
- Optimizing performance (already adequate)
- Supporting multiple LiDAR models (only LDS02RR)
- Full dependency injection framework (overkill for embedded)

## Decisions

### D1: Module Structure

**Decision**: Create 7 modules + slimmed main.cpp

```
firmware/
├── include/
│   ├── config.h         (existing - unchanged)
│   ├── motors.h
│   ├── encoders.h
│   ├── imu.h
│   ├── lidar.h
│   ├── servos.h
│   ├── safety.h
│   └── ros_bridge.h
├── src/
│   ├── main.cpp         (~50 lines)
│   ├── motors.cpp       (~90 lines)
│   ├── encoders.cpp     (~110 lines)
│   ├── imu.cpp          (~60 lines)
│   ├── lidar.cpp        (~130 lines)
│   ├── servos.cpp       (~50 lines)
│   ├── safety.cpp       (~40 lines)
│   ├── ros_bridge.cpp   (~220 lines)
│   └── cam_main.cpp     (existing - unchanged)
```

**Rationale**: Each module maps to a hardware subsystem or logical concern. PlatformIO automatically discovers all .cpp files in src/.

**Alternatives considered**:
- Single header-only refactor: Rejected - doesn't improve testability
- Namespace-based organization: Rejected - C-style modules are simpler for embedded

### D2: State Encapsulation Strategy

**Decision**: Module-private static variables with getter/setter functions

```cpp
// encoders.cpp
static volatile long encoder_left_ticks = 0;
static float odom_x = 0.0f;

// Public API
long encoders_get_left_ticks(bool reset);
float encoders_get_x();
```

**Rationale**: Prevents accidental modification from other modules. Getters enable testing with known values.

**Alternatives considered**:
- extern globals: Rejected - current problem, no encapsulation
- Struct-based state: Rejected - adds complexity without benefit for single-instance modules

### D3: ISR Placement

**Decision**: Encoder ISRs live in `encoders.cpp`, call into `motors.cpp` for direction

```cpp
// encoders.cpp
void IRAM_ATTR encoder_left_isr() {
    encoder_left_ticks += motors_get_left_dir();
}
```

**Rationale**: ISRs are logically part of encoder module. Direction comes from motors module via simple getter (no overhead - returns static int).

**Alternatives considered**:
- ISRs in main.cpp: Rejected - breaks encapsulation
- ISRs in motors.cpp: Rejected - encoders own tick counting

### D4: ROS Bridge Ownership

**Decision**: `ros_bridge.cpp` owns all micro-ROS entities and timer callbacks

```cpp
// ros_bridge.cpp contains:
// - rcl_publisher_t, rcl_subscription_t, rcl_timer_t
// - fast_timer_callback (50Hz) - calls other modules' update functions
// - scan_timer_callback (5Hz)
// - cmd_vel_callback, servo_cmd_callback

// Other modules provide data via getters:
float encoders_get_x();
float imu_get_accel_x();
const float* lidar_get_ranges();
```

**Rationale**: Centralizes ROS complexity. Hardware modules stay ROS-agnostic, enabling easier testing and potential reuse.

**Alternatives considered**:
- Each module publishes own messages: Rejected - scatters ROS code, harder to test
- Callback functions passed to modules: Rejected - adds complexity

### D5: Unit Test Mock Strategy

**Decision**: `#ifdef UNIT_TEST` guards around Arduino hardware calls

```cpp
// motors.cpp
#ifndef UNIT_TEST
#include <Arduino.h>
#endif

void motors_init() {
#ifndef UNIT_TEST
    pinMode(MOTOR_LEFT_AIN1, OUTPUT);
    ledcSetup(LEDC_CH_MOTOR_LEFT, 1000, 8);
    // ...
#endif
}

void motors_apply_cmd_vel(float linear_x, float angular_z) {
    // Kinematics logic (always runs)
    float left_speed = linear_x - angular_z * WHEEL_SEPARATION / 2.0f;
    
#ifndef UNIT_TEST
    ledcWrite(LEDC_CH_MOTOR_LEFT, left_pwm);
#endif
}
```

**Rationale**: Minimal overhead. Logic is testable, hardware calls are skipped in tests.

**Alternatives considered**:
- HAL abstraction layer: Rejected - overkill for this project size
- Link-time mocking: Rejected - complex build setup

### D6: Header Guard Style

**Decision**: Traditional `#ifndef`/`#define`/`#endif` guards

```cpp
#ifndef MOTORS_H_
#define MOTORS_H_
// ...
#endif // MOTORS_H_
```

**Rationale**: Maximum compiler compatibility. Some embedded toolchains don't support `#pragma once`.

### D7: Module Dependency Direction

**Decision**: Strict layered dependencies, no cycles

```
Layer 0: config.h (constants only)
Layer 1: motors, imu, lidar, servos (hardware drivers)
Layer 2: encoders (depends on motors for direction)
Layer 3: safety (depends on motors, lidar for watchdog actions)
Layer 4: ros_bridge (depends on all above for data)
Layer 5: main.cpp (orchestrates init + loop)
```

**Rationale**: Prevents circular dependencies, makes build order deterministic.

## Risks / Trade-offs

**[Risk] ISR latency from cross-module call**
→ Mitigation: `motors_get_left_dir()` returns static int, no function call overhead after inlining

**[Risk] Increased binary size from multiple translation units**
→ Mitigation: LTO (Link-Time Optimization) already enabled in PlatformIO; expect <1% size increase

**[Risk] Subtle behavior change during refactor**
→ Mitigation: Test on hardware after each module extraction; verify ROS topics unchanged

**[Trade-off] More files to navigate**
→ Accepted: IDE navigation + clear naming makes this manageable; benefits outweigh cost

**[Trade-off] Some code duplication in headers (includes)**
→ Accepted: Standard C practice; keeps modules self-contained
