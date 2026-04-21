# ADDED Requirements

## Requirement: Unified dashboard route

The system SHALL provide a single operator route at `/dashboard` that consolidates SLAM and tracking workflows into one unified workspace and removes page-to-page mode switching from the primary operator flow.

### Scenario: Opening the operator workspace

- **WHEN** an operator navigates to `/dashboard`
- **THEN** the system presents one dashboard shell with a persistent header, primary viewport region, control surfaces, and status bar

### Scenario: Switching primary operating context

- **WHEN** the operator changes between SLAM and Tracking from the dashboard mode control
- **THEN** the system updates the active workspace within the same page without requiring a route change

## Requirement: Mode-aware dashboard layout

The dashboard SHALL adapt its primary viewport and supporting control panels according to the active primary mode and SLAM submode while preserving a consistent HUD shell.

### Scenario: SLAM mapping layout

- **WHEN** the operator is in SLAM mode with mapping active
- **THEN** the occupancy map is shown as the primary viewport and SLAM mapping controls are shown in dashboard panels

### Scenario: SLAM navigation layout

- **WHEN** the operator is in SLAM mode with navigation active
- **THEN** the occupancy map remains the primary viewport and navigation-specific controls for saved maps and waypoint actions are shown in dashboard panels

### Scenario: Tracking layout

- **WHEN** the operator is in Tracking mode
- **THEN** the camera stream is shown as the primary viewport and tracking-specific controls, target management, and manual override affordances are shown in dashboard panels

## Requirement: Secondary context viewport

The dashboard SHALL show a secondary context view that complements the active primary viewport.

### Scenario: Camera context during SLAM workflows

- **WHEN** the operator is in any SLAM workflow
- **THEN** the dashboard shows the live camera feed as a picture-in-picture secondary view over the map workspace

### Scenario: Map context during tracking workflows

- **WHEN** the operator is in Tracking mode
- **THEN** the dashboard shows a compact minimap overlay as the secondary spatial context while the camera remains primary

## Requirement: Embedded enrollment and target management

The tracking workflow SHALL allow the operator to manage enrolled persons and choose a tracking target without leaving the dashboard.

### Scenario: Opening enrollment from tracking mode

- **WHEN** the operator invokes person enrollment from the tracking workspace
- **THEN** the system opens the enrollment flow in a modal and keeps the dashboard route active in the background

### Scenario: Selecting a tracking target

- **WHEN** the operator selects an enrolled person as the tracking target
- **THEN** the dashboard updates the active target state and reflects the selection in tracking controls and status surfaces

## Requirement: Persistent operational telemetry

The dashboard SHALL keep critical telemetry visible across SLAM and Tracking workflows.

### Scenario: Viewing telemetry on any dashboard mode

- **WHEN** the operator is using the unified dashboard in any primary mode
- **THEN** a persistent status bar shows operational telemetry including battery, signal, frame rate, and pose information
