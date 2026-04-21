# ADDED Requirements

## Requirement: Body detection

The person_tracker_node SHALL detect human bodies in camera frames using YOLOv8n model and track them using body bounding boxes.

### Scenario: Single person in frame

- **WHEN** one person is visible in ESP32-CAM frame
- **THEN** system detects body and publishes TrackedPersonArray with one TrackedPerson containing body_bbox

### Scenario: Multiple people in frame

- **WHEN** multiple people are visible in frame
- **THEN** system detects all bodies and publishes TrackedPersonArray with multiple TrackedPerson entries

### Scenario: No person in frame

- **WHEN** no person is visible in frame
- **THEN** system publishes TrackedPersonArray with empty persons array

## Requirement: Face detection within body

The person_tracker_node SHALL detect faces within detected body bounding boxes using InsightFace.

### Scenario: Face visible within body

- **WHEN** face is visible within a detected body bbox
- **THEN** TrackedPerson includes face_bbox populated and face_visible=true

### Scenario: Face not visible (person turned away)

- **WHEN** person's face is not visible (back turned)
- **THEN** TrackedPerson includes face_bbox zeroed and face_visible=false
- **THEN** body_bbox is still tracked

## Requirement: Face recognition

The person_tracker_node SHALL match detected faces against enrolled embeddings to identify persons.

### Scenario: Recognized enrolled person

- **WHEN** detected face matches enrolled person "John" with confidence > 0.6
- **THEN** TrackedPerson includes person_id="john-uuid", confidence=0.85 (example)

### Scenario: Unknown person

- **WHEN** detected face does not match any enrolled person (confidence < 0.6)
- **THEN** TrackedPerson includes person_id="", confidence=0.0

### Scenario: Face not visible for recognition

- **WHEN** body is detected but face_visible=false
- **THEN** TrackedPerson retains last known person_id if tracking same body
- **THEN** confidence decreases over time without face confirmation

## Requirement: Target marking

The person_tracker_node SHALL mark the active tracking target in published messages.

### Scenario: Target person detected

- **WHEN** active target "John" is detected in frame
- **THEN** TrackedPerson for John includes is_target=true
- **THEN** all other TrackedPerson entries have is_target=false

### Scenario: Target person not in frame

- **WHEN** active target is set but not detected in frame
- **THEN** all TrackedPerson entries have is_target=false

### Scenario: No target set (track any)

- **WHEN** no active target is set
- **THEN** largest/closest detected person has is_target=true

## Requirement: Embedding hot-reload

The person_tracker_node SHALL reload embeddings when persons are added or removed.

### Scenario: Person added during tracking

- **WHEN** new person "Mary" is enrolled via AddPerson service
- **THEN** person_tracker_node loads new embedding within 1 second
- **THEN** system can recognize "Mary" in subsequent frames

### Scenario: Person removed during tracking

- **WHEN** person "John" is removed via RemovePerson service
- **THEN** person_tracker_node removes embedding within 1 second
- **THEN** system no longer recognizes "John" (treats as unknown)

## Requirement: TrackedPersonArray message format

The person_tracker_node SHALL publish tracking data on `/tracked_persons` topic using TrackedPersonArray message.

### Scenario: Message structure

- **WHEN** system publishes tracking data
- **THEN** message contains header with timestamp and frame_id
- **THEN** message contains array of TrackedPerson with:
  - person_id (string, empty if unknown)
  - confidence (float32, 0-1)
  - is_target (bool)
  - body_bbox (BoundingBox2D with center_x, center_y, width, height normalized 0-1)
  - face_bbox (BoundingBox2D, zeroed if not visible)
  - face_visible (bool)

## Requirement: Tracking frame rate

The person_tracker_node SHALL process frames at a rate matching the camera input.

### Scenario: Normal operation

- **WHEN** camera publishes at 10fps
- **THEN** tracker processes and publishes at ~10fps (within 100ms latency)

### Scenario: Processing overload

- **WHEN** processing takes longer than frame interval
- **THEN** system drops frames to maintain real-time operation
- **THEN** system logs warning about frame drops
