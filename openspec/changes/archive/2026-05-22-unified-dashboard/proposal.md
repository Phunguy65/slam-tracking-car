# Why

The current SLAM Tracking Car dashboard splits core operations across separate pages for landing, SLAM, tracking, and enrollment, forcing operators to navigate between contexts during live robot control. A unified dashboard is needed now to reduce mode-switching friction, keep critical telemetry and emergency controls visible at all times, and present SLAM and tracking workflows as a single operator experience.

## What Changes

- Add a new `/dashboard` route that consolidates SLAM and tracking workflows into one unified operator workspace.
- Replace page-to-page mode navigation with in-dashboard mode and submode switching for SLAM mapping, SLAM navigation, and tracking.
- Introduce a shared viewport system that dynamically presents the occupancy map or camera stream as the primary view, with PiP or minimap secondary context based on the active mode.
- Refactor existing SLAM, tracking, and enrollment UI into reusable dashboard-oriented components, including an enrollment modal instead of a standalone page.
- Add dashboard-specific state management for primary mode, submode, viewport composition, PiP behavior, target selection, and manual override affordances.
- Preserve the existing HUD visual language, design tokens, glassmorphic panels, and status surfaces while adapting them to a single-page layout.
- Add unified accessibility and resilience behavior, including keyboard shortcuts, reconnect overlays, no-signal placeholders, and inline ROS error messaging.
- **BREAKING**: Deprecate the current multi-page operator flow rooted in `/`, `/slam`, `/tracking`, and `/enrollment` as the primary runtime navigation model.

## Capabilities

### New Capabilities

- `unified-operations-dashboard`: A single dashboard route that combines SLAM and tracking controls, adaptive viewports, persistent status surfaces, and modal enrollment flows into one operator workspace.
- `dashboard-command-and-resilience`: Dashboard-level control behavior for submode switching, joystick enablement rules, keyboard shortcuts, emergency stop access, and connection or stream failure handling.

### Modified Capabilities

- None.

## Impact

- Affected code: `src/app/page.tsx`, `src/app/slam/`, `src/app/tracking/`, `src/app/enrollment/`, layout header integration, and new `src/app/dashboard/` and `src/components/dashboard/` / `src/components/viewport/` modules.
- Affected state: Existing Zustand stores for ROS and SLAM mode plus a new dashboard state store coordinating unified mode, viewport, and interaction state.
- Affected UI systems: shared HUD components, emergency stop and connection status surfaces, camera and map rendering containers, and enrollment interactions.
- Affected behavior: operator navigation model, keyboard interaction model, error presentation, and manual-control availability rules.
