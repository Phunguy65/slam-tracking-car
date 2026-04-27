# ADDED Requirements

## Requirement: Log monitor auto-copies selected text

The dashboard SHALL attempt to copy selected ROS log text to the system clipboard when the user releases the mouse after selecting text inside the log monitor scroll region.

### Scenario: Copy non-empty selected text

-  **WHEN** the user completes a drag selection inside the log monitor and the trimmed selected text is non-empty
-  **THEN** the dashboard copies the selected text to the clipboard without requiring an additional keyboard shortcut or button click

### Scenario: Ignore empty selection

-  **WHEN** the user releases the mouse inside the log monitor and the current selection is empty or trims to an empty string
-  **THEN** the dashboard SHALL NOT call the clipboard write operation

### Scenario: Ignore clipboard failures silently

-  **WHEN** the user selects non-empty log text but the clipboard API is unavailable or the write request fails
-  **THEN** the dashboard SHALL ignore the failure without showing an error, toast, or other visible feedback
