## Context

Backend tracking is complete and merged (archive `2026-05-21-face-tracking-enrollment`):
- `/tracked_persons` (`slam_car_interfaces/TrackedPersonArray`) — each person has `range_m` (NaN when no leg-pair match) and `bearing_rad`
- `/tracking_controller/status` (`std_msgs/String`) — JSON payload `{state, target_id, range_m, obstacle}` published at 5 Hz
- Enrollment services `/enrollment/{add_person, remove_person, list_persons, set_target, get_target}` and topic `/enrollment/status`

The unified dashboard (change `unified-dashboard`) has all the orchestration in place: `ModeController`, `UnifiedDashboard` orchestrator, `PrimaryViewport`, `SwappableMinimap`, `PictureInPicture`, `StatusBar`, `ReconnectOverlay`, `DashboardKeyboardHandler`. Only the tracking-specific panels and overlay are missing.

UI was last present at git ref `a87fe0ba5395`. The shape is correct; only types need upgrading for the new backend fields.

**Current state:**
- `app/src/components/tracking/camera-stream.tsx` — present (subscribes `/camera/image_raw/compressed`)
- `app/src/components/dashboard/{unified-dashboard,mode-controller,…}.tsx` — present, evolved beyond `a87fe0ba5395` (added `LogMonitor`, `ServoPanControl`, `setMinimapViewMode`, `setCameraStreamEnabled`)
- `app/src/stores/dashboard-store.ts` — present, but `PrimaryMode` is only `'slam'`
- `app/src/types/ros-messages.ts` — present, but no `TrackedPerson`/`EnrolledPerson` types

**Constraints:**
- Next.js 16 + React 19 + TypeScript
- Zustand stores, hooks `use-topic`/`use-service`/`use-action`
- Biome (lint), Vitest (test), Bun (package manager)
- Path alias `@/*` → `app/src/*`

## Goals / Non-Goals

**Goals:**
- Tab "Tracking" alongside "SLAM" on `ModeController`, click or shortcut `'2'`
- Camera as primary viewport with person overlay when tracking is active
- Lidar minimap as secondary context during tracking
- Real-time tracking status panel (state, target name, `range_m`, `obstacle`)
- Person list with thumbnail + set target + remove
- Enroll modal with webcam capture + scan effect
- PID tuner via `ros2 param` services
- Full state coverage: Loading / Error / Empty / Disconnected / Active
- Keyboard shortcut `'2'` for tracking, preserve `'1'` for SLAM

**Non-Goals:**
- WebRTC video streaming (continue MJPEG bridge for camera, base64 for enrollment)
- Multi-target tracking (single target only)
- Re-enrollment / updating embeddings of an existing person
- Mobile responsive layout (desktop-first; existing dashboard is desktop-only)
- i18n (English only)
- E2E tests (only unit + integration with mocked rosbridge)
- Backend changes (already complete)

## Decisions

### D1: Cherry-pick from `a87fe0ba5395` vs rewrite from scratch

**Choice:** Cherry-pick + adapt where types changed.

**Alternatives considered:**
- Rewrite from scratch: cleaner but doubles effort with no benefit since shape is proven correct
- Selective cherry-pick of stable parts only: harder to track than restoring everything and patching

**Rationale:** UI shape was reviewed and merged once. Only types need upgrading for `range_m` + `bearing_rad`. Cherry-pick saves ~70 % of the effort.

### D2: `TrackingControllerStatus` from `std_msgs/String` JSON

**Choice:** Subscribe `std_msgs/String` and `JSON.parse(msg.data)` through a typed helper `parseTrackingControllerStatus(jsonString): TrackingControllerStatus | null`.

**Alternatives considered:**
- Custom ROS msg type: matches strong typing but adds a third-party message dependency for a 4-field payload
- Multiple individual topics (`/.../state`, `/.../range`, …): more topics, more subscriptions, more wire churn

**Rationale:** The backend's `tracking_controller_node` already publishes JSON because that decision was already made and validated for status (D11 in backend design). Frontend mirrors with a single typed parse helper. Parse failures degrade to "Status: unavailable" rather than crashing.

### D3: `range_m` null-safety

**Choice:** When backend publishes `NaN` (no leg-pair match), JSON serialises to `null`. The frontend treats both `null` and non-finite numbers as "unknown" and displays `"—"`. Helper `Number.isFinite(range_m)` is the gate.

**Rationale:** Mirrors backend D9 (`range_m=NaN` when no leg-pair match). Avoids `0` ambiguity (0 m would be a real reading at the robot's body).

### D4: Person overlay coordinate system

**Choice:** Bbox values are normalised 0–1 and multiplied by viewport container width/height for SVG overlay coordinates.

**Alternatives considered:**
- Pixel-space bboxes from camera: tightly couples overlay to camera resolution; breaks when viewport size differs
- Pre-computed transform matrix: more complex, no benefit for axis-aligned bboxes

**Rationale:** Decouples overlay from camera resolution and viewport size. Same overlay works in PiP, primary viewport, and any future fullscreen mode.

### D5: Manual override exclusivity

**Choice:** "Tracking" enabled and "Manual Override" enabled are mutually exclusive (a switch flip on either turns off the other). Joystick only publishes `/cmd_vel` when manual override is on.

**Alternatives considered:**
- Allow both on, last-writer-wins on `/cmd_vel`: causes oscillation, tracking and joystick fight each other
- Block tracking entirely while manual override is on: same behaviour, but less explicit in UI

**Rationale:** Explicit, prevents conflicting `/cmd_vel` publishers. Already implemented in the `a87fe0ba5395` store and matches operator mental model ("either the robot follows me or I drive it").

### D6: Empty enrollment list as primary affordance

**Choice:** When `persons.length === 0`, the tracking panels surface a prominent "+ Add person" call-to-action instead of an empty list and silent "Set target" controls.

**Rationale:** First-time users open tracking, see no one enrolled, and need an obvious next step. Surfacing the affordance reduces "the tab does nothing" reports.

## Risks / Trade-offs

### R1: Status JSON parse failure
**Risk:** Backend payload schema drifts (added/renamed field).
**Mitigation:** `parseTrackingControllerStatus` returns `null` on any error. Panel shows "Status: unavailable" instead of crashing. Console warn once per session.

### R2: Person overlay desync from camera frame
**Risk:** `/camera/image_raw/compressed` and `/tracked_persons` arrive at different timestamps; bbox lags behind frame.
**Mitigation:** Use latest message per topic. Visual lag <100 ms is acceptable for tracking UX. Future: sync by `header.stamp` if drift becomes visible.

### R3: Empty list confuses operator
**Risk:** Operator opens tracking tab with no one enrolled and does not realise enrolment exists.
**Mitigation:** D6 — empty state is the primary affordance.

### R4: Webcam permission denied
**Risk:** Browser blocks `getUserMedia`; enrolment dead-ends.
**Mitigation:** Existing `WebcamCapture` pattern shows "Camera access required" with a retry button.

### R5: Cherry-picked components reference deleted enrollment route
**Risk:** Restored components may still link to `/enrollment` (page deleted in `ca02a824fe84`).
**Mitigation:** During cherry-pick, audit imports and route references. Replace with `enrollModalOpen` store flag.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       UnifiedDashboard                            │
│                                                                  │
│   ModeController     ┌──────┬──────────┐                         │
│                      │ SLAM │ Tracking │  ←shortcut 1 / 2        │
│                      └──────┴──────────┘                         │
│                                                                  │
│   PrimaryViewport    isTracking ?                                │
│                      ├── CameraStream + PersonOverlay            │
│                      │     ↑ /tracked_persons (range_m,          │
│                      │       bearing_rad, body_bbox, face_bbox)  │
│                      │                                           │
│                      └── (else) SlamViewport                     │
│                                                                  │
│   Secondary:         isSlam     → PictureInPicture (camera)      │
│                      isTracking → MinimapOverlay (lidar)         │
│                                                                  │
│   Bottom panels:     isSlam     → SlamPanels                     │
│                      isTracking → TrackingPanels                 │
│                                    ├── Tracking switch           │
│                                    ├── Manual Override (excl.)   │
│                                    ├── TrackingStatus            │
│                                    │     ↑ /tracking_controller/ │
│                                    │       status (String JSON)  │
│                                    ├── Target selector           │
│                                    │     → /enrollment/set_target│
│                                    ├── Enroll modal trigger      │
│                                    │     → EnrollModal           │
│                                    └── PidTuner                  │
│                                          → ros2 param services   │
└──────────────────────────────────────────────────────────────────┘

EnrollModal:
  ├── WebcamCapture → /enrollment/image (CompressedImage base64)
  ├── ScanOverlay  ← /enrollment/status (EnrollmentStatus)
  ├── EnrollForm   → /enrollment/add_person
  └── PersonList   ← /enrollment/list_persons
                   → /enrollment/{remove_person, set_target}
```

## File Changes Summary

| Area | Files | Action |
|------|-------|--------|
| Types | `types/enrollment.ts` | Restore + add `range_m`, `bearing_rad`, `TrackingControllerStatus`, `parseTrackingControllerStatus` |
| Types | `types/ros-messages.ts` | Re-export tracking types if needed |
| Stores | `stores/enrollment-store.ts` | Restore (NEW) |
| Stores | `stores/dashboard-store.ts` | Merge: widen `PrimaryMode`, add tracking fields, keep evolved fields |
| Hooks | `hooks/use-enrollment.ts` | Restore (NEW) |
| Tracking | `components/tracking/{tracking-controls, pid-tuner}.tsx` | Restore unchanged |
| Tracking | `components/tracking/tracking-status.tsx` | Restore + rewrite subscribe to JSON parse |
| Tracking | `components/tracking/person-overlay.tsx` | Restore + adapt for `range_m` text |
| Enrollment | `components/enrollment/*.tsx` (7 files) | Restore unchanged |
| Dashboard | `components/dashboard/{tracking-panels, enroll-modal}.tsx` | Restore (NEW) |
| Dashboard | `components/dashboard/{mode-controller, unified-dashboard, dashboard-keyboard-handler}.tsx` | Merge: add tracking branch + shortcut `'2'` |
| Viewport | `components/viewport/primary-viewport.tsx` | Merge: accept `mode` prop, branch on tracking |
| Viewport | `components/viewport/minimap-overlay.tsx` | Restore (NEW) |
| Tests | `stores/dashboard-store.test.ts`, new tests for parse helper, status panel, overlay | Update + add |
