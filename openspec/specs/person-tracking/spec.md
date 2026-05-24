## ADDED Requirements

### Requirement: Body detection

The `person_tracker_node` SHALL detect human bodies in camera frames using the YOLOv8n model and track them using body bounding boxes.

#### Scenario: Single person in frame

- **WHEN** one person is visible in the ESP32-CAM frame
- **THEN** the system detects the body and publishes `TrackedPersonArray` with one `TrackedPerson` containing `body_bbox`

#### Scenario: Multiple people in frame

- **WHEN** multiple people are visible in the frame
- **THEN** the system detects all bodies and publishes `TrackedPersonArray` with multiple `TrackedPerson` entries

#### Scenario: No person in frame

- **WHEN** no person is visible in the frame
- **THEN** the system publishes `TrackedPersonArray` with an empty persons array

### Requirement: Face detection within body

The `person_tracker_node` SHALL detect faces within detected body bounding boxes using InsightFace.

#### Scenario: Face visible within body

- **WHEN** a face is visible within a detected body bbox
- **THEN** the `TrackedPerson` has `face_bbox` populated and `face_visible=true`

#### Scenario: Face not visible (person turned away)

- **WHEN** the person's face is not visible (back turned)
- **THEN** the `TrackedPerson` has `face_bbox` zeroed and `face_visible=false`
- **AND** `body_bbox` is still tracked

### Requirement: Face recognition

The `person_tracker_node` SHALL match detected faces against enrolled embeddings to identify persons.

#### Scenario: Recognized enrolled person

- **WHEN** a detected face matches enrolled person "John" with cosine similarity > 0.6
- **THEN** the `TrackedPerson` has `person_id="john-uuid"` and `confidence` equal to the similarity score

#### Scenario: Unknown person

- **WHEN** a detected face does not match any enrolled person (similarity < 0.6)
- **THEN** the `TrackedPerson` has `person_id=""` and `confidence=0.0`

#### Scenario: Face not visible for recognition

- **WHEN** a body is detected but `face_visible=false`
- **THEN** the `TrackedPerson` retains the last known `person_id` if tracking the same body

### Requirement: Identity persistence with confidence decay

The `person_tracker_node` SHALL keep a body track associated with the last recognised `person_id` while the face is hidden, decaying `confidence` over time.

#### Scenario: Confidence decays without face confirmation

- **WHEN** a tracked body has not had its face re-confirmed for `t` seconds
- **THEN** `confidence = max(0, last_confidence − 0.1 × t)`

#### Scenario: Identity dropped when confidence too low

- **WHEN** the decayed `confidence` falls below 0.3
- **THEN** the `TrackedPerson` has `person_id=""` and `confidence=0.0`
- **AND** the body track is no longer associated with that identity

### Requirement: Target marking

The `person_tracker_node` SHALL mark the active tracking target in published messages.

#### Scenario: Target person detected

- **WHEN** the active target "John" is detected in the frame
- **THEN** the `TrackedPerson` for John has `is_target=true`
- **AND** all other `TrackedPerson` entries have `is_target=false`

#### Scenario: Target person not in frame

- **WHEN** the active target is set but not detected
- **THEN** every `TrackedPerson` entry has `is_target=false`

#### Scenario: No target set (track any)

- **WHEN** no active target is set
- **THEN** the largest detected body (by bbox area) has `is_target=true`

### Requirement: Embedding hot-reload

The `person_tracker_node` SHALL reload embeddings from SQLite when the database file changes.

#### Scenario: Person added during tracking

- **WHEN** a new person "Mary" is enrolled via `AddPerson`
- **THEN** the `person_tracker_node` loads the new embedding within 1 second
- **AND** the system recognises "Mary" in subsequent frames

#### Scenario: Person removed during tracking

- **WHEN** person "John" is removed via `RemovePerson`
- **THEN** the `person_tracker_node` drops the embedding within 1 second
- **AND** the system no longer recognises "John" (treats as unknown)

### Requirement: TrackedPersonArray message format

The `person_tracker_node` SHALL publish tracking data on `/tracked_persons` using the `TrackedPersonArray` message, with each entry containing identity, geometry, and metric range.

#### Scenario: Message structure

- **WHEN** the system publishes tracking data
- **THEN** the message contains a `header` with timestamp and frame_id `laser_link`
- **AND** an array of `TrackedPerson` where each entry has:
  - `person_id` (string, empty if unknown)
  - `confidence` (float32 in [0, 1])
  - `is_target` (bool)
  - `body_bbox` (`BoundingBox2D` with normalised `center_x`, `center_y`, `width`, `height`)
  - `face_bbox` (`BoundingBox2D`, zeroed if not visible)
  - `face_visible` (bool)
  - `range_m` (float32, metres from LiDAR; `NaN` if no leg-cluster match)
  - `bearing_rad` (float32, bearing in `laser_link` frame)

### Requirement: LiDAR–camera fusion for metric range

The `person_tracker_node` SHALL subscribe to `/scan`, `/joint_states`, and `/camera_info` and use LiDAR leg clusters to assign metric `range_m` and `bearing_rad` to each `TrackedPerson`.

#### Scenario: Leg cluster matches body bbox bearing

- **WHEN** a leg-pair cluster (two clusters 5–30 cm wide, centroid gap 15–35 cm, range 0.3–3.0 m) lies within `bearing_match_tolerance_rad` of a body bbox bearing
- **THEN** the `TrackedPerson` has `range_m` equal to the leg-pair centroid range and `bearing_rad` equal to the bbox bearing in `laser_link`

#### Scenario: No leg cluster matches

- **WHEN** no leg-pair cluster lies within `bearing_match_tolerance_rad` of the bbox bearing
- **THEN** `range_m=NaN` and `bearing_rad` is still computed from the bbox
- **AND** a warning is logged at most once per second

#### Scenario: Bearing transform uses live pan angle

- **WHEN** the camera pan-servo angle changes (`/joint_states`)
- **THEN** the bearing transform from `camera_optical_frame` to `laser_link` reflects the new angle without manual code adjustment (handled by `tf2_ros.Buffer`)

#### Scenario: TF lookup fails

- **WHEN** `tf2_ros.Buffer.lookup_transform` raises an exception for the image timestamp
- **THEN** the frame is skipped and a warning is logged at most once per second
- **AND** no `TrackedPersonArray` message is published for that frame

### Requirement: Tracking frame rate

The `person_tracker_node` SHALL process frames at a rate matching the camera input.

#### Scenario: Normal operation

- **WHEN** the camera publishes at 10 fps
- **THEN** the tracker processes and publishes at ~10 fps within 100 ms latency

#### Scenario: Processing overload

- **WHEN** processing takes longer than the frame interval
- **THEN** the system drops frames to maintain real-time operation
- **AND** logs a warning about frame drops at most once per second

### Requirement: /camera_info publishing from cam_bridge_node

The `cam_bridge_node` SHALL publish `sensor_msgs/CameraInfo` on `/camera_info` with the same timestamp as each `/camera/image_raw` message.

#### Scenario: CameraInfo content

- **WHEN** `cam_bridge_node` publishes a frame
- **THEN** a corresponding `CameraInfo` message is published with `frame_id=camera_optical_frame` and the same `header.stamp`
- **AND** intrinsic matrix `K` is computed as `cx=w/2, cy=h/2, fx=fy=w/(2·tan(FOV_h/2))` using the configured horizontal FOV
- **AND** distortion coefficients `D` are zero
- **AND** projection `P` is `[[fx,0,cx,0],[0,fy,cy,0],[0,0,1,0]]`
- **AND** rectification `R` is the identity matrix

#### Scenario: Configurable FOV

- **WHEN** `camera_fov_horizontal_deg` is set at launch (default 62°)
- **THEN** `K` is recomputed using the configured value
