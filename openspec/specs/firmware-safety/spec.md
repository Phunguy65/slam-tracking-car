# ADDED Requirements

## Requirement: Motors stop on WiFi disconnect

The firmware SHALL detect WiFi/micro-ROS agent disconnect and immediately set both motor PWM duty cycles to 0, stopping the robot. An LED SHALL blink to indicate disconnected state. The firmware SHALL attempt automatic reconnection in a loop.

### Scenario: WiFi connection lost

- **WHEN** the micro-ROS agent becomes unreachable
- **THEN** both motors stop within 100ms, LED begins blinking, and reconnection attempts start

### Scenario: WiFi reconnects

- **WHEN** the micro-ROS agent becomes reachable again after a disconnect
- **THEN** the firmware re-initializes micro-ROS entities and resumes normal operation. Motors remain stopped until a new `/cmd_vel` is received.

## Requirement: Motors stop on cmd_vel timeout

The firmware SHALL implement a 1-second watchdog timer for `/cmd_vel` messages. If no `/cmd_vel` message is received within 1 second, both motors SHALL be stopped. Servo positions SHALL be held (not reset).

### Scenario: cmd_vel stops arriving

- **WHEN** 1 second elapses since the last `/cmd_vel` message
- **THEN** both motor PWM duty cycles are set to 0

### Scenario: cmd_vel resumes after timeout

- **WHEN** a new `/cmd_vel` message arrives after a timeout stop
- **THEN** motors respond to the new command immediately

## Requirement: LiDAR failure halts motors

The firmware SHALL monitor LiDAR data availability. If no valid scan data is received for 2 seconds after initial startup completes, the firmware SHALL stop both motors and hold position until LiDAR data resumes. The firmware SHALL NOT restart.

### Scenario: LiDAR data stream stops

- **WHEN** no LiDAR scan points are received for 2 seconds
- **THEN** both motors stop and `/scan` publishing pauses

### Scenario: LiDAR data resumes

- **WHEN** LiDAR scan data begins arriving again after a halt
- **THEN** `/scan` publishing resumes and motors accept `/cmd_vel` commands again

## Requirement: IMU failure degrades gracefully

The firmware SHALL attempt MPU6050 initialization 3 times. If all attempts fail, the firmware SHALL disable IMU functionality and continue operating without `/imu/data_raw` publishing. A warning SHALL be logged to Serial output.

### Scenario: IMU fails at startup

- **WHEN** MPU6050 does not respond after 3 initialization attempts
- **THEN** IMU is disabled, `/imu/data_raw` is not published, all other functionality operates normally

### Scenario: IMU succeeds on retry

- **WHEN** MPU6050 fails first attempt but succeeds on second attempt
- **THEN** IMU initializes normally and `/imu/data_raw` begins publishing
