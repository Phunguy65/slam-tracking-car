# Tasks

## 1. Dashboard foundation

- [x] 1.1 Create the `/dashboard` route and add the `unified-dashboard` orchestrator component scaffold with the requested shell regions for header, primary viewport, control panels, joystick area, and status bar
- [x] 1.2 Add a dedicated dashboard Zustand store for primary mode, SLAM submode, auto explore, tracking state, target selection, viewport composition, PiP placement, minimap visibility, and modal visibility
- [x] 1.3 Wire the dashboard shell to existing ROS and SLAM mode stores without duplicating canonical connection or service-backed mode state ← (verify: dashboard state only orchestrates UI while ROS connection and SLAM mode still come from existing domain stores)

## 2. Adaptive viewport system

- [x] 2.1 Implement `primary-viewport`, `picture-in-picture`, `minimap-overlay`, and `viewport-switcher` components with shared HUD styling and reusable empty/error containers
- [x] 2.2 Refactor existing map and camera rendering components so the dashboard can render map-primary SLAM views and camera-primary tracking views from the same viewport system
- [x] 2.3 Connect viewport rules so SLAM mapping and navigation show map + camera PiP, and Tracking shows camera + minimap overlay ← (verify: each mode/submode matches the spec-defined primary and secondary viewport behavior)

## 3. Mode controls and dashboard panels

- [x] 3.1 Build dashboard mode controls for primary mode switching, SLAM submode switching, and auto explore toggling while preserving the existing HUD theme and header affordances
- [x] 3.2 Refactor SLAM panels for map management, navigation controls, status, and joystick placement so they fit the unified dashboard layout instead of the standalone `/slam` page
- [x] 3.3 Refactor tracking panels for tracking status, target selection, manual override, and optional advanced tuning placement within the unified dashboard ← (verify: operators can switch contexts without route changes and always see the correct mode-specific controls)

## 4. Enrollment, accessibility, and resilience

- [x] 4.1 Convert the enrollment page flow into an `enroll-modal` component that reuses existing enrollment widgets inside the dashboard and supports selecting the active tracking target
- [x] 4.2 Add dashboard keyboard interactions for emergency stop, joystick arrows, mode shortcuts, panel focus order, and ARIA labels on all new interactive controls
- [x] 4.3 Implement reconnecting overlays, `No Signal` viewport placeholders, and inline ROS error banners for failed commands or mode transitions ← (verify: keyboard shortcuts respect control gating, emergency stop remains globally reachable, and all required failure states render actionable feedback)

## 5. Migration and validation

- [x] 5.1 Update the app shell and routing so `/` points operators to `/dashboard` and legacy mode pages are marked deprecated or redirected according to the rollout plan
- [x] 5.2 Add or update component and integration tests covering mode switching, viewport composition, control gating, enrollment modal behavior, keyboard shortcuts, and dashboard fault states
- [ ] 5.3 Run project validation for the unified dashboard flow and fix regressions in layout, accessibility, and shared ROS interactions ← (verify: `/dashboard` is the primary operator experience, legacy navigation no longer drives the core workflow, and tests cover the new dashboard behavior)
