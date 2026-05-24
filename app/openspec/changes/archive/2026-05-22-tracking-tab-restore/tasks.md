## 1. Types upgrade

- [x] 1.1 Restore `app/src/types/enrollment.ts` from commit `a87fe0ba5395`
- [x] 1.2 Add `range_m: number` and `bearing_rad: number` fields to `TrackedPerson`
- [x] 1.3 Add `TrackingControllerStatus` interface with fields `state: string`, `target_id: string`, `range_m: number | null`, `obstacle: boolean`
- [x] 1.4 Add `parseTrackingControllerStatus(jsonString: string): TrackingControllerStatus | null` helper that returns `null` on parse error
- [x] 1.5 Re-export tracking and enrollment types from `app/src/types/ros-messages.ts` if existing modules expect them there ← (verify: tsc compiles, helper handles malformed JSON without throwing)

## 2. Stores

- [x] 2.1 Restore `app/src/stores/enrollment-store.ts` from `a87fe0ba5395`
- [x] 2.2 Merge `app/src/stores/dashboard-store.ts`:
  - Widen `PrimaryMode` from `'slam'` to `'slam' | 'tracking'`
  - Add fields `trackingEnabled: boolean`, `targetPerson: string | null`, `enrollModalOpen: boolean`, `manualOverride: boolean`
  - Add setters `setTrackingEnabled`, `setTargetPerson`, `setEnrollModalOpen`, `setManualOverride`
  - Update `setPrimaryMode` to set `primaryViewport` to `'map'` for SLAM and `'camera'` for tracking, and to reset `manualOverride`
  - Implement mutual exclusivity in `setTrackingEnabled` and `setManualOverride`
  - Keep evolved fields untouched: `minimapViewMode`, `cameraStreamEnabled`, `setCameraStreamEnabled`, `setMinimapViewMode`, `toggleMinimapViewMode` ← (verify: existing `dashboard-store.test.ts` still passes plus new fields default correctly)

## 3. Hooks

- [x] 3.1 Restore `app/src/hooks/use-enrollment.ts` from `a87fe0ba5395`
- [x] 3.2 Audit any deleted-route imports inside the hook and replace with the modal flag from `dashboard-store` ← (verify: `useEnrollment` returns the documented shape and does not import `app/src/app/enrollment/*`)

## 4. Tracking components

- [x] 4.1 Restore `app/src/components/tracking/tracking-controls.tsx` from `a87fe0ba5395`
- [x] 4.2 Restore `app/src/components/tracking/tracking-status.tsx` and rewrite it to subscribe `/tracking_controller/status` (`std_msgs/String`), call `parseTrackingControllerStatus`, and render `state`, `target_id` (resolved to a person name when possible), `range_m` (`"—"` when not finite), and an obstacle badge
- [x] 4.3 Restore `app/src/components/tracking/pid-tuner.tsx` from `a87fe0ba5395`
- [x] 4.4 Restore `app/src/components/tracking/person-overlay.tsx` and adapt it to draw body and face bboxes via SVG using normalised coordinates, highlight the target with a thick orange border, and render range text formatted to one decimal place plus " m" when `Number.isFinite(range_m)` ← (verify: overlay renders correctly when fed a sample `TrackedPersonArray` with finite and non-finite ranges)

## 5. Enrollment components

- [x] 5.1 Restore `app/src/components/enrollment/enroll-form.tsx` from `a87fe0ba5395`
- [x] 5.2 Restore `app/src/components/enrollment/face-status.tsx`
- [x] 5.3 Restore `app/src/components/enrollment/person-card.tsx`
- [x] 5.4 Restore `app/src/components/enrollment/person-list.tsx`
- [x] 5.5 Restore `app/src/components/enrollment/scan-overlay.tsx`
- [x] 5.6 Restore `app/src/components/enrollment/target-badge.tsx`
- [x] 5.7 Restore `app/src/components/enrollment/webcam-capture.tsx` ← (verify: webcam capture publishes to `/enrollment/image` at approximately 10 fps when the modal is open and permission is granted)

## 6. Dashboard layout

- [x] 6.1 Restore `app/src/components/dashboard/tracking-panels.tsx` from `a87fe0ba5395`
- [x] 6.2 Restore `app/src/components/dashboard/enroll-modal.tsx` from `a87fe0ba5395`
- [x] 6.3 Merge `app/src/components/dashboard/mode-controller.tsx` to add a second `ModeButton` for Tracking with the `Target` icon from `lucide-react` and shortcut label `'2'`
- [x] 6.4 Merge `app/src/components/dashboard/unified-dashboard.tsx`:
  - Add `isTracking = primaryMode === 'tracking'`
  - Render `<TrackingPanels />` in the bottom-left panel column when `isTracking`
  - Render `<MinimapOverlay />` when `isTracking && minimapEnabled`
  - Compute `showTrackingJoystick = isTracking && manualOverride` and render `<ManualJoystick>` when either SLAM-mapping or tracking-override condition holds
  - Preserve existing `LogMonitor`, `ServoPanControl`, `StatusBar`, `ReconnectOverlay`
- [x] 6.5 Update `app/src/components/dashboard/dashboard-keyboard-handler.tsx` to switch to tracking on `'2'` while preserving `'1'` for SLAM, suppressing the shortcut when the focused element is a text input or textarea ← (verify: keyboard navigation works and SLAM shortcuts have no regressions)

## 7. Viewport

- [x] 7.1 Merge `app/src/components/viewport/primary-viewport.tsx` to accept a `mode: PrimaryMode` prop, render `<CameraStream />` plus `<PersonOverlay />` when `mode === 'tracking'`, and render the existing SLAM viewport otherwise
- [x] 7.2 Restore `app/src/components/viewport/minimap-overlay.tsx` from `a87fe0ba5395` ← (verify: viewport switches correctly between modes without remounting state-bearing components unnecessarily)

## 8. Tests

- [x] 8.1 Update `app/src/stores/dashboard-store.test.ts` for widened `PrimaryMode`, new fields, mutual exclusivity, and `setPrimaryMode` viewport switching
- [x] 8.2 Add `app/src/types/enrollment.test.ts` for `parseTrackingControllerStatus` covering valid payload, malformed JSON, missing fields, and `range_m` null vs finite
- [x] 8.3 Add `app/src/components/tracking/tracking-status.test.tsx` for parse success, parse failure, finite range, null range, obstacle badge, loading, and disconnected states (asserting distinct testids)
- [x] 8.4 Add `app/src/components/tracking/person-overlay.test.tsx` for body bbox render, face bbox render, target highlight, range text shown vs omitted ← (verify: `bun test` passes the new and updated tests)
- [x] 8.5 Add `app/src/components/dashboard/tracking-panels.test.tsx` covering Disconnected, Error+Retry, Loading, Empty+CTA, Active states for the Target panel and confirming switch disabled state when offline

## 9. Build verification

- [x] 9.1 Run `cd app && bun install` if dependencies need refresh
- [x] 9.2 Run `cd app && bun run lint` (Biome)
- [x] 9.3 Run `cd app && bun run typecheck` (`tsc --noEmit`)
- [x] 9.4 Run `cd app && bun run test:run` (vitest under jsdom; `bun test` does not honor `vitest.config.ts`)
- [ ] 9.5 Smoke test manually: `cd app && bun run dev`, open `/dashboard`, click the Tracking tab, verify Empty state with no persons enrolled, confirm Disconnected overlay when rosbridge is offline ← (verify: all checks pass and manual smoke produces expected states)
