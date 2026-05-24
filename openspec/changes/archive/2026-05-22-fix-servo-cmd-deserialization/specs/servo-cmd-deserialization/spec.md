# ADDED Requirements

## Requirement: Servo command JointState subscriber pre-allocates deserialization buffers

The firmware SHALL pre-allocate writable storage for the `/servo_cmd` `sensor_msgs/JointState` subscriber message before the executor starts. The pre-allocation SHALL include a valid string buffer for the supported joint name entry and numeric sequence storage for `position`, `velocity`, and `effort` so incoming messages can be deserialized without dropping delivery before the callback runs.

### Scenario: Incoming pan command deserializes successfully

-  **WHEN** the ESP32 receives a `/servo_cmd` JointState message containing `name=["camera_pan_joint"]` and `position=[0.75]`
-  **THEN** the subscriber message buffer SHALL accept the joint name and numeric data without deserialization failure
-  **AND** the servo command callback SHALL receive the decoded message

### Scenario: Subscriber buffers remain valid across reconnect setup

-  **WHEN** the firmware reruns message setup during micro-ROS reconnection
-  **THEN** the `/servo_cmd` subscriber SHALL still have valid pre-allocated string and numeric sequence storage for the next incoming command
