# ADDED Requirements

## Requirement: Dashboard displays live camera stream

The dashboard SHALL display the ESP32-CAM video stream in the Tracking mode view. The stream SHALL use the compressed image topic `/camera/image_raw/compressed` to minimize bandwidth. The video SHALL render to a Canvas element at the camera's native resolution.

### Scenario: Camera stream displays when tracking mode active

- **WHEN** user navigates to Tracking mode
- **THEN** the camera stream container displays live video from `/camera/image_raw/compressed`

### Scenario: Camera stream shows placeholder when disconnected

- **WHEN** the rosbridge connection is lost OR camera topic stops publishing for > 2 seconds
- **THEN** the camera container displays a "No Signal" placeholder with reconnection indicator

## Requirement: Dashboard overlays face detection bounding boxes

The dashboard SHALL render face detection bounding boxes over the camera stream. Bounding box positions SHALL be computed from `/face_detections` PoseArray messages where `pose.position.x` and `pose.position.y` are normalized (0..1) coordinates and `pose.position.z` represents normalized face width.

### Scenario: Single face detected

- **WHEN** `/face_detections` contains one pose with position (0.5, 0.4, 0.2)
- **THEN** a bounding box is drawn centered at 50% width, 40% height, with width 20% of frame

### Scenario: Multiple faces detected

- **WHEN** `/face_detections` contains multiple poses
- **THEN** a bounding box is drawn for each face with distinct visual indicator

### Scenario: No face detected

- **WHEN** `/face_detections` is empty or not received for > 500ms
- **THEN** no bounding boxes are displayed and status shows "No face detected"

## Requirement: Dashboard provides tracking start/stop control

The dashboard SHALL provide a toggle control to start and stop face tracking. When tracking is stopped, the dashboard SHALL publish zero velocity to `/cmd_vel` to halt robot movement.

### Scenario: User starts tracking

- **WHEN** user enables the tracking toggle AND a face is detected
- **THEN** the face_follow_controller begins publishing `/cmd_vel` commands to follow the face

### Scenario: User stops tracking

- **WHEN** user disables the tracking toggle
- **THEN** the dashboard publishes `Twist(linear.x=0, angular.z=0)` to `/cmd_vel`
- **AND** the robot stops moving

## Requirement: Dashboard provides live PID parameter tuning

The dashboard SHALL display sliders for PID parameters (Kp, Ki, Kd) for both yaw and linear control. Slider changes SHALL call the `/face_follow_controller/set_parameters` service with debouncing (500ms). Parameter changes SHALL take effect immediately without node restart.

### Scenario: User adjusts yaw Kp

- **WHEN** user moves the yaw Kp slider to 0.5
- **THEN** after 500ms debounce, the dashboard calls `set_parameters` service with `pid_yaw_kp=0.5`
- **AND** the face_follow_controller applies the new Kp value immediately

### Scenario: User adjusts multiple parameters rapidly

- **WHEN** user adjusts Kp, Ki, and Kd sliders within 500ms
- **THEN** only one `set_parameters` call is made with all changed values

## Requirement: Dashboard displays tracking status

The dashboard SHALL display current tracking status including: face detection confidence, estimated distance (derived from face size), and tracking state (TRACKING / IDLE / NO_FACE).

### Scenario: Face being tracked

- **WHEN** a face is detected and tracking is enabled
- **THEN** status shows "TRACKING" with confidence percentage and estimated distance

### Scenario: Tracking enabled but no face

- **WHEN** tracking is enabled but no face detected for > 2 seconds
- **THEN** status shows "NO_FACE" with a visual warning indicator
