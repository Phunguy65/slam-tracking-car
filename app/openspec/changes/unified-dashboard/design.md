# Context

The current operator experience is split across four routes: a landing page at `/`, a SLAM workspace at `/slam`, a tracking workspace at `/tracking`, and a standalone enrollment page at `/enrollment`. The SLAM page already uses the project’s strongest HUD language with floating glass panels, full-screen map rendering, and an always-available joystick, while the tracking and enrollment flows still behave like separate application sections. Global ROS connectivity is provided by `RosProvider`, connection state comes from `useRosStore`, and SLAM mode switching is handled by `useModeStore`.

This redesign changes the architecture from page-based task switching to a single operator dashboard at `/dashboard`. The design must preserve the existing HUD tokens, reuse the mature SLAM and tracking widgets where practical, and avoid duplicating canonical robot state that already lives in ROS-aware stores and hooks. It also needs to handle live-operation concerns such as emergency stop, reconnect feedback, no-signal fallbacks, keyboard control, and mode-specific joystick rules.

## Goals / Non-Goals

**Goals:**

- Deliver a single `/dashboard` route that becomes the primary operator surface for SLAM and tracking workflows.
- Present a stable dashboard shell with a persistent header, adaptive main viewport, contextual secondary view, mode controls, joystick surface, and telemetry status bar.
- Model operator intent with dashboard UI state for primary mode, SLAM submode, viewport composition, PiP placement, target selection, and modal visibility.
- Reuse and refactor existing SLAM, tracking, and enrollment components instead of rebuilding map, camera, or ROS integrations from scratch.
- Provide predictable keyboard shortcuts, ARIA labeling, and clear operational failure states for ROS connection loss, stream failure, and mode-switch errors.

**Non-Goals:**

- Replacing the ROS transport layer, service contracts, or backend tracking/SLAM logic.
- Redesigning the existing visual theme, color tokens, or glassmorphic panel styling.
- Reworking core camera, map, person detection, or enrollment algorithms beyond what is needed for dashboard embedding.
- Permanently deleting legacy routes during the first implementation pass; deprecation and redirect behavior is sufficient.

## Decisions

### 1. Introduce a dashboard shell route and make legacy routes transitional

The implementation will add `src/app/dashboard/page.tsx` as the unified entry point and treat `/`, `/slam`, `/tracking`, and `/enrollment` as deprecated flows. The existing global header already contains the correct primitives—logo, mode selection, connection status, and emergency stop—so the preferred approach is to evolve that shell for dashboard use rather than building a second competing header.

This keeps the route structure simple, minimizes duplicated navigation chrome, and allows `/` to redirect to `/dashboard` once parity is reached. Legacy pages can remain temporarily available or redirect individually during rollout.

**Alternatives considered:**

- Build the entire dashboard, including header, inside `page.tsx`: rejected because it duplicates shell-level controls that already belong at the app layout boundary.
- Keep multi-page routes and add a tabbed container over them: rejected because operators would still carry page transitions and fragmented state.

### 2. Add a dedicated dashboard UI store that composes existing domain stores

The design introduces a new Zustand store for dashboard orchestration state:

- `primaryMode`
- `slamSubmode`
- `autoExplore`
- `trackingEnabled`
- `targetPerson`
- `primaryViewport`
- `pipEnabled`
- `pipPosition`
- `minimapEnabled`

This store is intentionally limited to UI orchestration and operator preferences. Canonical robot connectivity remains in `useRosStore`; SLAM service-backed mode switching remains in `useModeStore`; enrollment and target data continue to flow through the existing enrollment hook/store layer. Dashboard actions will call into existing domain actions instead of copying backend-facing logic.

**Why this approach:** it centralizes dashboard composition without creating multiple sources of truth for ROS-backed state.

**Alternatives considered:**

- Expand `useModeStore` to also hold tracking and viewport state: rejected because it would mix backend mode transitions with dashboard-only presentation concerns.
- Use local component state inside the dashboard tree: rejected because mode, keyboard, and panel behavior must stay consistent across multiple child components.

### 3. Compose the viewport around reusable primary and secondary containers

The dashboard will be driven by a `UnifiedDashboard` orchestrator and a small viewport system:

- `PrimaryViewport` owns the dominant surface and its empty/error/loading states.
- `PictureInPicture` renders the camera feed as a movable secondary surface during SLAM workflows.
- `MinimapOverlay` renders a compact map context during tracking workflows.
- `ViewportSwitcher` applies the mode-to-view rules and exposes any allowed swap or positioning controls.

Mode-specific content is mapped as follows:

- SLAM mapping: primary map, camera PiP, joystick enabled only when auto-explore is off.
- SLAM navigation: primary map, camera PiP, navigation controls active, joystick disabled.
- Tracking: primary camera stream with person overlays, compact minimap secondary, tracking controls and target selection visible.

This structure isolates layout behavior from domain widgets, allowing existing map and camera components to be reused inside a shared frame with consistent placeholders and overlays.

**Alternatives considered:**

- Hard-code separate page-like sections for each mode inside one file: rejected because shared behaviors such as retry overlays, PiP positioning, and focus handling would be duplicated.
- Render all views in a freeform CSS grid: rejected because the requested UX depends on a clearly dominant primary viewport and a consistent secondary context surface.

### 4. Convert enrollment from a route into a modal workflow

Enrollment will move from `/enrollment` into an `enroll-modal.tsx` flow that can be opened from tracking controls or target-management surfaces within the dashboard. The existing enrollment form, webcam capture, status, and person list components will be reused where possible, but they will be refactored to work inside a modal container instead of a full-page layout.

This keeps target management in the same operational context as face tracking, which is especially important when an operator needs to enroll or retarget without leaving the camera view.

**Alternatives considered:**

- Keep enrollment as a separate route launched in another tab or page: rejected because it breaks the single-dashboard requirement and hides live operational context.
- Build a lightweight drawer with only target selection: rejected because the request explicitly includes refactoring enrollment into a modal rather than removing the full workflow.

### 5. Handle keyboard control and operational failures at the dashboard boundary

Keyboard shortcuts and operational resilience will live in dashboard-level hooks and status surfaces rather than being scattered across leaf components. The dashboard boundary will:

- trigger emergency stop on `Space`
- route arrow keys to joystick commands only when manual motion is allowed and focus is not inside an editable field
- switch primary modes on `1` and `2`
- preserve natural `Tab` navigation order across dashboard panels
- show a reconnecting overlay with retry affordance when ROS disconnects
- show a `No Signal` viewport placeholder when camera or map streams fail
- surface mode or ROS errors through inline alert banners attached to the active control region

This keeps safety and resilience rules consistent regardless of which mode-specific panel is currently mounted.

**Alternatives considered:**

- Let each panel manage its own keyboard and error state: rejected because shortcuts and fault feedback must remain globally predictable.
- Block all keyboard shortcuts whenever any overlay is visible: rejected because emergency stop must remain reachable at all times.

## Risks / Trade-offs

- **[Performance pressure from simultaneous map and camera rendering]** → Mitigate by isolating viewport wrappers, memoizing mode-derived props, and allowing secondary surfaces to render lightweight placeholders or paused states when streams are unavailable.
- **[UI state drifting from ROS-backed state]** → Mitigate by keeping dashboard state presentation-only and delegating canonical mode transitions and connection state to existing domain stores.
- **[Keyboard shortcuts interfering with forms or modal interactions]** → Mitigate by ignoring directional shortcuts when focus is inside inputs, textareas, selects, buttons that consume arrows, or content-editable regions, while keeping emergency stop globally available.
- **[Migration confusion while old pages still exist]** → Mitigate by redirecting `/` early, labeling legacy routes as deprecated, and converging all new work onto `/dashboard`.
- **[Tracking and SLAM controls competing for limited panel space on smaller screens]** → Mitigate by using collapsible HUD panels, preserving priority order for critical controls, and deferring nonessential tuning surfaces behind secondary collapsible sections.

## Migration Plan

1. Add the new dashboard route, dashboard components, and dashboard store without removing existing pages.
2. Refactor reusable SLAM, tracking, and enrollment components into dashboard-friendly modules.
3. Update the app shell so `/` routes operators to `/dashboard` and the header reflects in-dashboard mode control.
4. Mark legacy routes as deprecated or redirect them after dashboard parity is validated.
5. Roll back, if necessary, by restoring `/` and direct route navigation while leaving refactored shared components in place.

## Open Questions

- Should deprecated routes immediately redirect to `/dashboard`, or should they remain temporarily accessible for internal QA comparison during rollout?
- Should PID tuning remain always visible in tracking mode, or collapse behind an advanced panel to keep the first dashboard release focused on primary operator actions?
