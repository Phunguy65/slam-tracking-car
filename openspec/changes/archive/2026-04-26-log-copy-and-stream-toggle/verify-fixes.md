## [2026-04-26] Round 1 (from apply auto-verify)

### Verifier

- Fixed: `log-monitor.tsx` scroll container changed from `<div>` to `<section>` with `aria-label='Log scroll area'` and `scrollRef` type updated to `HTMLElement` to resolve Biome a11y/useSemanticElements error from adding `onMouseUp` handler.
- Fixed: `picture-in-picture.tsx` import order reordered to place `usePublisher` import after `CameraStream` and before `cn`/`useDashboardStore`, satisfying Biome `organizeImports`. Formatter-required line wrapping applied to delta variable assignments.
- Fixed: `dashboard-store.ts` formatter-required line wrapping applied to `setCameraStreamEnabled` action definition.
