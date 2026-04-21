# ADDED Requirements

## Requirement: Webcam stream capture

The enrollment UI SHALL capture video frames from the laptop webcam using browser getUserMedia API and publish them as base64-encoded JPEG images to the `/enrollment/image` ROS2 topic via rosbridge WebSocket.

### Scenario: Webcam access granted

- **WHEN** user navigates to enrollment page and grants camera permission
- **THEN** system starts publishing frames at ~10fps to `/enrollment/image` topic

### Scenario: Webcam access denied

- **WHEN** user denies camera permission
- **THEN** system displays error message "Camera access required for enrollment"
- **THEN** system does not publish to `/enrollment/image` topic

## Requirement: Face detection for enrollment

The enrollment_node SHALL detect faces in incoming webcam frames using YOLOv8n and publish detection status to `/enrollment/status` topic (EnrollmentStatus message).

### Scenario: Face detected in frame

- **WHEN** a face is detected in the webcam frame
- **THEN** system publishes EnrollmentStatus with status=FACE_DETECTED and face_bbox populated
- **THEN** system begins scanning (extracting embedding) and publishes status=SCANNING with scan_progress 0.0-1.0

### Scenario: Scan complete

- **WHEN** face embedding extraction completes successfully
- **THEN** system publishes EnrollmentStatus with status=READY
- **THEN** UI enables the "Add Person" button

### Scenario: No face in frame

- **WHEN** no face is detected for 500ms
- **THEN** system publishes EnrollmentStatus with status=NO_FACE
- **THEN** UI displays "Position face in frame" message

### Scenario: Face leaves frame during scan

- **WHEN** face leaves frame while status=SCANNING
- **THEN** system resets to status=IDLE
- **THEN** scan_progress resets to 0.0

## Requirement: Add person service

The enrollment_node SHALL provide an `/enrollment/add_person` ROS2 service that saves the current face embedding to the SQLite database.

### Scenario: Add person successfully

- **WHEN** client calls AddPerson service with name="John" while status=READY
- **THEN** system generates UUID for person_id
- **THEN** system stores embedding, name, and JPEG thumbnail in SQLite
- **THEN** service returns success=true with person_id

### Scenario: Add person with no face ready

- **WHEN** client calls AddPerson service while status != READY
- **THEN** service returns success=false with error_message="No face ready for enrollment"

### Scenario: Add person with empty name

- **WHEN** client calls AddPerson service with name=""
- **THEN** service returns success=false with error_message="Name is required"

## Requirement: Remove person service

The enrollment_node SHALL provide an `/enrollment/remove_person` ROS2 service that deletes a person from the database.

### Scenario: Remove existing person

- **WHEN** client calls RemovePerson service with valid person_id
- **THEN** system deletes person from SQLite database
- **THEN** service returns success=true

### Scenario: Remove non-existent person

- **WHEN** client calls RemovePerson service with invalid person_id
- **THEN** service returns success=false with error_message="Person not found"

### Scenario: Remove active tracking target

- **WHEN** client calls RemovePerson for the currently active tracking target
- **THEN** system clears the active target (no one being tracked)
- **THEN** service returns success=true

## Requirement: List persons service

The enrollment_node SHALL provide an `/enrollment/list_persons` ROS2 service that returns all enrolled persons.

### Scenario: List with enrolled persons

- **WHEN** client calls ListPersons service with 3 persons enrolled
- **THEN** service returns array of 3 EnrolledPerson messages with id, name, thumbnail_base64, created_at

### Scenario: List with no enrolled persons

- **WHEN** client calls ListPersons service with empty database
- **THEN** service returns empty array

## Requirement: Set tracking target service

The enrollment_node SHALL provide an `/enrollment/set_target` ROS2 service that sets which person to track.

### Scenario: Set valid target

- **WHEN** client calls SetTrackingTarget with valid person_id
- **THEN** system updates active target in database
- **THEN** service returns success=true

### Scenario: Set invalid target

- **WHEN** client calls SetTrackingTarget with invalid person_id
- **THEN** service returns success=false with error_message="Person not found"

### Scenario: Clear target

- **WHEN** client calls SetTrackingTarget with empty person_id
- **THEN** system clears active target (track any detected person)
- **THEN** service returns success=true

## Requirement: Get tracking target service

The enrollment_node SHALL provide an `/enrollment/get_target` ROS2 service that returns the current tracking target.

### Scenario: Target is set

- **WHEN** client calls GetTrackingTarget with active target "John" (id=abc123)
- **THEN** service returns person_id="abc123", person_name="John"

### Scenario: No target set

- **WHEN** client calls GetTrackingTarget with no active target
- **THEN** service returns person_id="", person_name=""

## Requirement: Enrollment UI scan effect

The enrollment UI SHALL display a scanning animation when a face is detected and being processed.

### Scenario: Scan animation display

- **WHEN** EnrollmentStatus.status changes to SCANNING
- **THEN** UI displays animated scan line moving vertically over face bbox
- **THEN** UI displays corner brackets around face with cyan glow
- **THEN** UI displays progress bar with scan_progress percentage

### Scenario: Scan complete animation

- **WHEN** EnrollmentStatus.status changes to READY
- **THEN** UI displays green checkmark animation
- **THEN** corner brackets turn green
- **THEN** "VERIFIED" text appears briefly

## Requirement: Person list UI

The enrollment UI SHALL display a list of all enrolled persons with ability to set tracking target and remove.

### Scenario: Display enrolled persons

- **WHEN** user views enrollment page with 2 persons enrolled
- **THEN** UI displays 2 person cards with thumbnail, name, and created_at
- **THEN** active target shows target badge icon

### Scenario: Set target from list

- **WHEN** user clicks "Set Target" on a person card
- **THEN** system calls SetTrackingTarget service
- **THEN** target badge moves to selected person

### Scenario: Remove person from list

- **WHEN** user clicks remove button on a person card
- **THEN** system shows confirmation dialog
- **WHEN** user confirms
- **THEN** system calls RemovePerson service
- **THEN** person card is removed from list

## Requirement: SQLite database persistence

The enrollment_node SHALL persist enrolled persons in SQLite database at ~/.slam_car/face_db.sqlite.

### Scenario: Database initialization

- **WHEN** enrollment_node starts and database does not exist
- **THEN** system creates database file and persons table

### Scenario: Data persistence across restarts

- **WHEN** enrollment_node restarts
- **THEN** system loads all enrolled persons from existing database
- **THEN** previously enrolled persons are available for tracking
