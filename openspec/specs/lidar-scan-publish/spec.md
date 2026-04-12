# ADDED Requirements

## Requirement: LDS02RR scan data is parsed via kaiaai/LDS library

The firmware SHALL initialize the LDS02RR sensor using the kaiaai/LDS library on UART2 (RX=GPIO 16, baud=115200). The library's scan point callback SHALL accumulate 360 distance measurements (one per degree) into a buffer.

### Scenario: LiDAR starts receiving data

- **WHEN** the LDS02RR motor reaches stable 5 Hz rotation and UART data streams in
- **THEN** the kaiaai/LDS callback fires for each scan point, populating the 360-point buffer

## Requirement: LiDAR motor speed is PID-controlled at 5 Hz

The firmware SHALL use the kaiaai/LDS library's built-in PID controller to maintain LDS02RR rotation at 5 Hz (300 RPM) via PWM on GPIO 4 (LEDC channel 2, 25 kHz).

### Scenario: Motor speed stabilizes

- **WHEN** the LiDAR motor starts
- **THEN** the PID controller adjusts PWM duty cycle until rotation stabilizes at approximately 5 Hz

## Requirement: LaserScan is published on /scan at 5 Hz

The firmware SHALL publish `sensor_msgs/LaserScan` on `/scan` at 5 Hz with:
- `header.frame_id = "laser_link"`
- `angle_min = 0.0`
- `angle_max = 2 * PI` (360 degrees)
- `angle_increment = 2 * PI / 360` (~0.01745 radians)
- `range_min = 0.13` (130mm, LDS02RR minimum)
- `range_max = 8.0` (8000mm, LDS02RR maximum)
- `ranges` array: 360 float32 values in meters
- `time_between_measurements = 1.0 / (5.0 * 360.0)` (scan rate / points)

### Scenario: Full 360-degree scan published

- **WHEN** a complete 360-point scan is accumulated
- **THEN** a LaserScan message is published with 360 range values in meters

### Scenario: Invalid points are marked as infinity

- **WHEN** a scan point has distance=0 or is outside valid range (0.13m-8.0m)
- **THEN** the corresponding `ranges` entry is set to `INFINITY`

### Scenario: LaserScan frame ID matches URDF

- **WHEN** a `/scan` message is received
- **THEN** `header.frame_id` is `"laser_link"` matching the URDF laser_link frame
