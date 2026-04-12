# ADDED Requirements

## Requirement: URDF has pan-tilt revolute joints for camera

The `robot.urdf.xacro` SHALL replace the fixed `camera_joint` with a kinematic chain:
- `pan_joint` (revolute, Z axis) connecting `base_link` → `pan_link`
- `tilt_joint` (revolute, Y axis) connecting `pan_link` → `camera_link`
- `camera_optical_joint` (fixed) connecting `camera_link` → `camera_optical_frame`

Joint limits SHALL be 0 to PI radians (0-180 degrees) for both pan and tilt.

### Scenario: URDF validates with pan-tilt chain

- **WHEN** `check_urdf` is run on the generated URDF
- **THEN** the kinematic chain `base_link → pan_link → camera_link → camera_optical_frame` is valid

### Scenario: Pan joint rotates around Z axis

- **WHEN** `camera_pan_joint` position is set to 0 radians
- **THEN** the camera faces the default forward direction (center)

### Scenario: Tilt joint rotates around Y axis

- **WHEN** `camera_tilt_joint` position is set to -0.52 radians (~-30 degrees)
- **THEN** the camera tilts downward by 30 degrees

## Requirement: Joint names match firmware JointState messages

The URDF joint names SHALL be `camera_pan_joint` and `camera_tilt_joint`, exactly matching the joint names published by the ESP32 firmware on `/joint_states`.

### Scenario: robot_state_publisher updates camera TF

- **WHEN** `/joint_states` message arrives with `name=["camera_pan_joint", "camera_tilt_joint"]`
- **THEN** `robot_state_publisher` computes and broadcasts updated TF for `pan_link` and `camera_link`

## Requirement: IMU link is added to URDF

The URDF SHALL include an `imu_link` frame fixed to `base_link`, positioned at the physical location of the MPU6050 sensor on the robot chassis (center of base_link, on top surface).

### Scenario: IMU frame exists in TF tree

- **WHEN** `robot_state_publisher` is running
- **THEN** `ros2 run tf2_ros tf2_echo base_link imu_link` returns a valid static transform
