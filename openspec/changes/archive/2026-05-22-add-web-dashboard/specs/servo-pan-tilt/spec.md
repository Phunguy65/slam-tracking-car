# MODIFIED Requirements

## Requirement: Face follow controller supports live PID parameter updates

The face_follow_controller node SHALL register a parameter callback that applies PID parameter changes immediately without requiring node restart. Parameters `pid_yaw_kp`, `pid_yaw_ki`, `pid_yaw_kd`, `pid_linear_kp`, `pid_linear_ki`, `pid_linear_kd` SHALL be dynamically reconfigurable.

### Scenario: PID parameter updated via set_parameters service

- **WHEN** `/face_follow_controller/set_parameters` service is called with `pid_yaw_kp=0.5`
- **THEN** the controller immediately uses Kp=0.5 for yaw PID calculations
- **AND** subsequent control loop iterations use the new parameter value

### Scenario: Multiple parameters updated simultaneously

- **WHEN** `set_parameters` service is called with `pid_yaw_kp=0.4`, `pid_yaw_ki=0.01`, `pid_yaw_kd=0.08`
- **THEN** all three parameters are applied atomically before next control loop iteration

### Scenario: Invalid parameter value rejected

- **WHEN** `set_parameters` service is called with `pid_yaw_kp=-1.0` (negative value)
- **THEN** service returns failure with reason "PID gains must be non-negative"
- **AND** current parameter values remain unchanged
