## Why

The unified dashboard's tracking workflow exists in the proposal but the actual UI was deleted by mistake during a "docs" commit (`7d9548d37a77`) and a follow-up refactor commit (`ca02a824fe84`). Backend tracking has been fully restored (change `face-tracking-enrollment`, archived 2026-05-21) including new fields `range_m` + `bearing_rad` on `TrackedPerson` and a new `/tracking_controller/status` JSON topic. Operators currently have no way to use tracking from the dashboard.

## What Changes

- Add tab "Tracking" alongside "SLAM" on `ModeController` with keyboard shortcut `2`
- Restore tracking UI components (person overlay, status panel, controls, PID tuner)
- Restore enrollment UI (modal, person list, webcam capture, scan effect)
- Add `range_m` + `bearing_rad` fields to the `TrackedPerson` TypeScript type
- Add new `TrackingControllerStatus` type for parsing `/tracking_controller/status` JSON payload
- Render metric range text on person overlay when `range_m` is finite
- Display `obstacle` badge on tracking status panel
- Provide Loading / Error / Empty / Disconnected / Active states on every tracking panel
- **BREAKING (UI only)**: `PrimaryMode` widens from `'slam'` to `'slam' | 'tracking'`

## Capabilities

### New Capabilities

- `person-tracking-ui`: Tab tracking, person overlay, tracking status panel, PID tuner, manual override, target selection, lidar minimap during tracking
- `person-enrollment-ui`: Enrollment modal, person list, webcam capture, scan effect, add/remove person, set target

### Modified Capabilities

- `unified-operations-dashboard`: Adds tracking primary mode requirement, person overlay binding to `/tracked_persons`, status panel binding to `/tracking_controller/status` JSON, lidar minimap as secondary context during tracking, and metric range display

## Impact

- App code: `app/src/components/{tracking,enrollment,dashboard,viewport}/*.tsx` (restore + new), `app/src/stores/{dashboard-store,enrollment-store}.ts` (modify + new), `app/src/hooks/use-enrollment.ts` (new), `app/src/types/{enrollment,ros-messages}.ts` (modify + new)
- No backend changes — backend tracking already complete in archive `2026-05-21-face-tracking-enrollment`
- No new dependencies — uses existing roslibjs, Zustand, Vitest, Tailwind, shadcn/ui
