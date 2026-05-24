### Requirement: Enrollment modal trigger

The dashboard SHALL provide an "Add person" affordance that opens an enrollment modal without leaving the dashboard route.

#### Scenario: Open modal from tracking panel

- **WHEN** the operator clicks "Add person" in the tracking panels
- **THEN** `enrollModalOpen` becomes `true`
- **AND** the enrollment modal renders over the dashboard

#### Scenario: Open modal from empty person list

- **WHEN** the operator clicks the prominent "+" call-to-action shown when no persons are enrolled
- **THEN** `enrollModalOpen` becomes `true`

#### Scenario: Close modal

- **WHEN** the operator closes the modal (close button, escape key, or after a successful add)
- **THEN** `enrollModalOpen` becomes `false`

### Requirement: Webcam capture publishing

The enrollment modal SHALL capture frames from the laptop webcam via `getUserMedia` and publish them to `/enrollment/image` (`sensor_msgs/CompressedImage`) at approximately 10 fps as base64-encoded JPEG.

#### Scenario: Webcam access granted

- **WHEN** the modal opens and the operator grants camera permission
- **THEN** frames are captured and published to `/enrollment/image` at approximately 10 fps

#### Scenario: Webcam access denied

- **WHEN** the operator denies camera permission
- **THEN** the modal displays "Camera access required for enrollment"
- **AND** no frames are published

### Requirement: Scan animation overlay

The enrollment modal SHALL display a scan animation overlay synced to `/enrollment/status`.

#### Scenario: Status SCANNING

- **WHEN** `EnrollmentStatus.status === SCANNING`
- **THEN** an animated scan line moves vertically over the face bbox
- **AND** corner brackets render with a cyan glow
- **AND** a progress bar reflects `scan_progress`

#### Scenario: Status READY

- **WHEN** `EnrollmentStatus.status === READY`
- **THEN** a green checkmark animation displays briefly
- **AND** the corner brackets turn green

### Requirement: Face status indicator

The enrollment modal SHALL display the current face detection status as a label.

#### Scenario: Status mapping

- **WHEN** `EnrollmentStatus.status` is one of `IDLE`, `FACE_DETECTED`, `SCANNING`, `READY`, or `NO_FACE`
- **THEN** the modal displays the corresponding human-readable label and styling

### Requirement: Add person form

The enrollment modal SHALL provide a name input plus an "Add" button that calls `/enrollment/add_person` when status is `READY`.

#### Scenario: Add with valid name

- **WHEN** the operator enters a non-empty name and clicks Add while status is `READY`
- **THEN** the UI calls `/enrollment/add_person` with the name
- **AND** on success, the modal closes
- **AND** the person list refreshes

#### Scenario: Add with empty name

- **WHEN** the operator clicks Add with an empty name
- **THEN** the form displays "Name is required"
- **AND** no service call is made

#### Scenario: Add when not ready

- **WHEN** the operator clicks Add while status is not `READY`
- **THEN** the Add button is disabled
- **AND** the form displays "Wait for scan to complete"

### Requirement: Person list

The tracking panels SHALL display a list of enrolled persons by calling `/enrollment/list_persons` and rendering one card per person.

#### Scenario: Render enrolled persons

- **WHEN** `/enrollment/list_persons` returns N persons
- **THEN** the list renders N cards, each showing the thumbnail, name, and `created_at`

#### Scenario: Active target badge

- **WHEN** the current target id matches a person's id
- **THEN** that person's card displays a target badge

#### Scenario: Refresh on enrollment changes

- **WHEN** `/enrollment/add_person` or `/enrollment/remove_person` succeeds
- **THEN** the list re-fetches and re-renders

### Requirement: Set tracking target

Each person card SHALL provide a "Set Target" affordance that calls `/enrollment/set_target` with the person's id.

#### Scenario: Set target

- **WHEN** the operator clicks "Set Target" on a person card
- **THEN** the UI calls `/enrollment/set_target` with that person's id
- **AND** on success, the target badge moves to that card

#### Scenario: Clear target

- **WHEN** the operator clears the target (e.g. via a dedicated control)
- **THEN** the UI calls `/enrollment/set_target` with empty id

### Requirement: Remove person

Each person card SHALL provide a remove affordance protected by a confirmation dialog.

#### Scenario: Confirm remove

- **WHEN** the operator clicks Remove on a person card and confirms in the dialog
- **THEN** the UI calls `/enrollment/remove_person` with that person's id
- **AND** on success, the card disappears from the list

#### Scenario: Cancel remove

- **WHEN** the operator clicks Remove on a person card and cancels in the dialog
- **THEN** no service call is made

### Requirement: Empty enrollment state

The tracking panels SHALL display a prominent empty state when no persons are enrolled.

#### Scenario: No persons enrolled

- **WHEN** `/enrollment/list_persons` returns an empty array
- **THEN** the panel displays "No persons enrolled" with a prominent "+ Add person" call-to-action

### Requirement: Webcam permission denied state

The webcam capture component SHALL handle camera-permission denial without crashing.

#### Scenario: Permission denied

- **WHEN** `getUserMedia` rejects with `NotAllowedError` or similar
- **THEN** the component displays "Camera access required for enrollment"
- **AND** offers a retry button that re-requests permission
