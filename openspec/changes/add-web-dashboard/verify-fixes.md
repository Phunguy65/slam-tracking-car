# Verify Fixes Log

## [2026-04-13] Round 1 (from opsx-apply auto-verify)

### opsx-arch-verifier

- Fixed: GoalSetter/NavigationStatus split action state - Created shared `nav-store.ts` with singleton action client and state, updated both components to use `useNavStore()` instead of independent `useAction()` calls
- Fixed: usePublisher missing unadvertise() - Added `topic.unadvertise()` call in cleanup function in `use-topic.ts`
- Fixed: ManualJoystick interval not cleaned up on unmount - Added useEffect cleanup that clears interval and sends zero velocity on unmount

### opsx-uiux-verifier

- Fixed: Canvas elements have no accessible label - Added `role="img"` and `aria-label` to camera-stream, occupancy-map, lidar-radar canvases; added `aria-hidden="true"` to decorative overlays (face-overlay, robot-marker)
- Fixed: ManualJoystick has no keyboard equivalent - Added arrow key support with onKeyDown/onKeyUp handlers, tabIndex, role="application", and aria-label
- Fixed: SaveMapButton input has no label - Added `<label>` with sr-only class and aria-label to input
- Fixed: MapSelector select has no label - Added `<label>` with sr-only class and aria-label to select
