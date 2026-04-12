# ADDED Requirements

## Requirement: GPIO pin definitions match TB6612FNG wiring

The firmware `config.h` SHALL define GPIO pins matching the TB6612FNG motor driver wiring: Left motor (PWMA=25, AIN1=26, AIN2=27), Right motor (PWMB=14, BIN1=23, BIN2=13), LiDAR motor PWM=4, LiDAR UART RX=16, IMU SDA=21, IMU SCL=22, Encoder Left=32, Encoder Right=33, Servo Pan=18, Servo Tilt=19.

### Scenario: Config defines all GPIO pins

- **WHEN** `config.h` is compiled
- **THEN** all 15 GPIO pin defines are present and match the hardware wiring table

### Scenario: No boot-sensitive GPIO used for motors

- **WHEN** motor direction pins are defined
- **THEN** GPIO 12 SHALL NOT be used (causes ESP32 boot failure when pulled high)

## Requirement: LEDC PWM channel allocation is conflict-free

The firmware SHALL allocate LEDC channels as follows: Ch0=Left motor (1kHz, 8-bit), Ch1=Right motor (1kHz, 8-bit), Ch2=LiDAR motor (25kHz, 8-bit), Ch3=Servo Pan (50Hz, 16-bit), Ch4=Servo Tilt (50Hz, 16-bit). No two peripherals SHALL share a LEDC channel.

### Scenario: All PWM peripherals operate simultaneously

- **WHEN** motors, LiDAR motor, and both servos are active
- **THEN** each uses its assigned LEDC channel with no interference

## Requirement: Robot geometry constants are accurate

The firmware SHALL define `WHEEL_RADIUS=0.033f` (33mm), `WHEEL_SEPARATION=0.17f` (170mm), and `ENCODER_PPR=20` matching the physical robot measurements.

### Scenario: Odometry math uses correct constants

- **WHEN** encoder ticks are converted to distance
- **THEN** each tick equals `2 * PI * 0.033 / 20 = 0.01037m`

## Requirement: config.h.example mirrors config.h structure

The `config.h.example` file SHALL contain the same defines as `config.h` with placeholder values for WiFi credentials and agent IP, serving as a template for new developers.

### Scenario: New developer copies example config

- **WHEN** a developer copies `config.h.example` to `config.h`
- **THEN** only WiFi SSID, WiFi password, and agent IP need to be edited
