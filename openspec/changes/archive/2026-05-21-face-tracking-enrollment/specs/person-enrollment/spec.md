## ADDED Requirements

### Requirement: Webcam stream capture

The enrollment UI SHALL capture video frames from the laptop webcam using the browser `getUserMedia` API and publish them as base64-encoded JPEG images to the `/enrollment/image` ROS2 topic via rosbridge WebSocket.

#### Scenario: Webcam access granted

- **WHEN** user navigates to the enrollment page and grants camera permission
- **THEN** the system starts publishing frames at ~10 fps to `/enrollment/image`

#### Scenario: Webcam access denied

- **WHEN** user denies camera permission
- **THEN** the system displays the error message "Camera access required for enrollment"
- **AND** does not publish to `/enrollment/image`

### Requirement: Face detection for enrollment

The `enrollment_node` SHALL detect faces in incoming webcam frames using YOLOv8n and publish detection status to the `/enrollment/status` topic (`EnrollmentStatus` message).

#### Scenario: Face detected in frame

- **WHEN** a face is detected in the webcam frame
- **THEN** the system publishes `EnrollmentStatus` with `status=FACE_DETECTED` and `face_bbox` populated
- **AND** begins extracting an embedding and publishes `status=SCANNING` with `scan_progress` between 0.0 and 1.0

#### Scenario: Scan complete

- **WHEN** face-embedding extraction completes successfully
- **THEN** the system publishes `EnrollmentStatus` with `status=READY`
- **AND** the UI enables the "Add Person" button

#### Scenario: No face in frame

- **WHEN** no face is detected for 500 ms
- **THEN** the system publishes `EnrollmentStatus` with `status=NO_FACE`
- **AND** the UI displays "Position face in frame"

#### Scenario: Face leaves frame during scan

- **WHEN** a face leaves the frame while `status=SCANNING`
- **THEN** the system resets to `status=IDLE`
- **AND** `scan_progress` resets to 0.0

### Requirement: Add person service

The `enrollment_node` SHALL provide an `/enrollment/add_person` ROS2 service that saves the current face embedding to the SQLite database.

#### Scenario: Add person successfully

- **WHEN** a client calls `AddPerson` with `name="John"` while `status=READY`
- **THEN** the system generates a UUID for `person_id`
- **AND** stores the embedding, name, and JPEG thumbnail in SQLite
- **AND** the service returns `success=true` with `person_id`

#### Scenario: Add person with no face ready

- **WHEN** a client calls `AddPerson` while `status != READY`
- **THEN** the service returns `success=false` with `error_message="No face ready for enrollment"`

#### Scenario: Add person with empty name

- **WHEN** a client calls `AddPerson` with `name=""`
- **THEN** the service returns `success=false` with `error_message="Name is required"`

### Requirement: Remove person service

The `enrollment_node` SHALL provide an `/enrollment/remove_person` ROS2 service that deletes a person from the database.

#### Scenario: Remove existing person

- **WHEN** a client calls `RemovePerson` with a valid `person_id`
- **THEN** the system deletes the person from SQLite
- **AND** the service returns `success=true`

#### Scenario: Remove non-existent person

- **WHEN** a client calls `RemovePerson` with an invalid `person_id`
- **THEN** the service returns `success=false` with `error_message="Person not found"`

#### Scenario: Remove active tracking target

- **WHEN** a client calls `RemovePerson` for the currently active tracking target
- **THEN** the system clears the active target (no one being tracked)
- **AND** the service returns `success=true`

### Requirement: List persons service

The `enrollment_node` SHALL provide an `/enrollment/list_persons` ROS2 service that returns all enrolled persons.

#### Scenario: List with enrolled persons

- **WHEN** a client calls `ListPersons` with three persons enrolled
- **THEN** the service returns an array of three `EnrolledPerson` messages with `id`, `name`, `thumbnail_base64`, and `created_at`

#### Scenario: List with no enrolled persons

- **WHEN** a client calls `ListPersons` with an empty database
- **THEN** the service returns an empty array

### Requirement: Set tracking target service

The `enrollment_node` SHALL provide an `/enrollment/set_target` ROS2 service that sets which person to track.

#### Scenario: Set valid target

- **WHEN** a client calls `SetTrackingTarget` with a valid `person_id`
- **THEN** the system updates the active target in the database
- **AND** the service returns `success=true`

#### Scenario: Set invalid target

- **WHEN** a client calls `SetTrackingTarget` with an invalid `person_id`
- **THEN** the service returns `success=false` with `error_message="Person not found"`

#### Scenario: Clear target

- **WHEN** a client calls `SetTrackingTarget` with an empty `person_id`
- **THEN** the system clears the active target (track any detected person)
- **AND** the service returns `success=true`

### Requirement: Get tracking target service

The `enrollment_node` SHALL provide an `/enrollment/get_target` ROS2 service that returns the current tracking target.

#### Scenario: Target is set

- **WHEN** a client calls `GetTrackingTarget` with active target "John" (`id=abc123`)
- **THEN** the service returns `person_id="abc123"` and `person_name="John"`

#### Scenario: No target set

- **WHEN** a client calls `GetTrackingTarget` with no active target
- **THEN** the service returns `person_id=""` and `person_name=""`

### Requirement: Enrollment UI scan effect

The enrollment UI SHALL display a scanning animation when a face is detected and being processed.

#### Scenario: Scan animation display

- **WHEN** `EnrollmentStatus.status` changes to `SCANNING`
- **THEN** the UI displays an animated scan line moving vertically over the face bbox
- **AND** displays corner brackets around the face with a cyan glow
- **AND** displays a progress bar reflecting `scan_progress`

#### Scenario: Scan complete animation

- **WHEN** `EnrollmentStatus.status` changes to `READY`
- **THEN** the UI displays a green-checkmark animation
- **AND** the corner brackets turn green
- **AND** the text "VERIFIED" appears briefly

### Requirement: Person list UI

The enrollment UI SHALL display a list of all enrolled persons with the ability to set the tracking target and remove persons.

#### Scenario: Display enrolled persons

- **WHEN** the user views the enrollment page with two persons enrolled
- **THEN** the UI displays two person cards with thumbnail, name, and `created_at`
- **AND** the active target shows a target badge

#### Scenario: Set target from list

- **WHEN** the user clicks "Set Target" on a person card
- **THEN** the system calls `SetTrackingTarget`
- **AND** the target badge moves to the selected person

#### Scenario: Remove person from list

- **WHEN** the user clicks the remove button on a person card
- **THEN** the system shows a confirmation dialog
- **WHEN** the user confirms
- **THEN** the system calls `RemovePerson`
- **AND** the person card is removed from the list

### Requirement: SQLite database persistence

The `enrollment_node` SHALL persist enrolled persons in a SQLite database at `~/.slam_car/face_db.sqlite`.

#### Scenario: Database initialization

- **WHEN** `enrollment_node` starts and the database does not exist
- **THEN** the system creates the database file and `persons` table

#### Scenario: Data persistence across restarts

- **WHEN** `enrollment_node` restarts
- **THEN** the system loads all enrolled persons from the existing database
- **AND** previously enrolled persons are available for tracking
