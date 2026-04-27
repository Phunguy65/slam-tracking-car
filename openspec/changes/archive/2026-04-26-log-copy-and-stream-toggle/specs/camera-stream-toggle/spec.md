# ADDED Requirements

## Requirement: Dashboard can toggle camera streaming

The dashboard SHALL provide a camera stream toggle in the picture-in-picture header that reflects the current stream intent, updates dashboard state, and publishes the new state on `/cam/stream_enable` using `std_msgs/msg/Bool`.

### Scenario: Disable stream from the PiP header

-  **WHEN** camera streaming is currently enabled and the user activates the stream toggle button
-  **THEN** the dashboard sets `cameraStreamEnabled` to `false`
-  **AND** the dashboard publishes `{ data: false }` on `/cam/stream_enable`
-  **AND** the button updates its icon and accessible labels to represent the disabled state

### Scenario: Re-enable stream from the PiP header

-  **WHEN** camera streaming is currently disabled and the user activates the stream toggle button
-  **THEN** the dashboard sets `cameraStreamEnabled` to `true`
-  **AND** the dashboard publishes `{ data: true }` on `/cam/stream_enable`
-  **AND** the button updates its icon and accessible labels to represent the enabled state

## Requirement: Camera panel shows an explicit disabled state

The camera stream view SHALL render a disabled placeholder instead of the live stream canvas whenever camera streaming is disabled.

### Scenario: Render stream-off placeholder

-  **WHEN** `CameraStream` receives `enabled = false`
-  **THEN** it renders a black placeholder with centered `Stream Off` text styled as a subdued monospace status
-  **AND** it SHALL NOT present the live camera canvas while disabled

## Requirement: ESP32-CAM obeys runtime stream enable messages

The ESP32-CAM firmware SHALL subscribe to `/cam/stream_enable` as `std_msgs/msg/Bool` and use the latest received value to control whether frame capture and publication occur.

### Scenario: Firmware disables frame capture

-  **WHEN** the firmware receives a `std_msgs/msg/Bool` message with `data = false` on `/cam/stream_enable`
-  **THEN** it updates its stream-enabled flag to false
-  **AND** subsequent stream loop iterations SHALL skip frame capture and frame publication while continuing to service the connection

### Scenario: Firmware resumes frame capture

-  **WHEN** the firmware receives a `std_msgs/msg/Bool` message with `data = true` on `/cam/stream_enable`
-  **THEN** it updates its stream-enabled flag to true
-  **AND** subsequent stream loop iterations SHALL resume normal frame capture and publication

### Scenario: Firmware avoids busy looping while disabled

-  **WHEN** camera streaming is disabled in the firmware stream loop
-  **THEN** the loop waits for the configured frame interval before the next iteration instead of capturing a frame immediately
