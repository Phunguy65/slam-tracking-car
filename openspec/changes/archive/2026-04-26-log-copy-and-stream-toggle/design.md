# Context

The change spans both the web dashboard and the ESP32-CAM firmware, with a ROS topic acting as the contract between them. The current dashboard already exposes a ROS log monitor and a picture-in-picture camera panel, while the camera firmware continuously captures and publishes frames once connected. The requested behavior adds two operator-facing controls: frictionless copying of selected log text and explicit runtime control over whether the camera continues streaming.

This work must preserve the existing dashboard interaction model and the existing micro-ROS connection lifecycle. The stream toggle is intentionally lightweight: a dashboard boolean state, a published `std_msgs/msg/Bool` message on `/cam/stream_enable`, and firmware gating around frame capture. The log auto-copy change is constrained to be silent and non-blocking, with no notifications or fallback UI.

## Goals / Non-Goals

**Goals:**

- Add automatic clipboard copy for non-empty ROS log selections when mouse selection completes in the log monitor.
- Add a dashboard camera stream toggle that updates local UI state, publishes to ROS, and changes the camera panel rendering.
- Allow the ESP32-CAM firmware to stop capturing and sending frames while remaining connected to micro-ROS and ready to resume.
- Keep the implementation scoped to the identified files and avoid introducing new dependencies or protocol changes beyond the new Bool topic.

**Non-Goals:**

- Adding toast messages, clipboard failure alerts, or any visible confirmation for log copying.
- Introducing a ROS service, action, or acknowledgement flow for stream control.
- Changing the underlying camera transport, MJPEG decoding pipeline, or reconnect behavior.
- Hiding or redesigning the existing ViewportSwitcher behavior for showing or closing the camera PiP.

## Decisions

### Use mouseup-triggered clipboard copy in the log monitor
The log monitor will copy selected text during the scroll container's `onMouseUp` event by reading `window.getSelection()?.toString()?.trim()` and attempting `navigator.clipboard.writeText(...)` only when the trimmed selection is non-empty.

This approach matches the requested interaction with minimal code and keeps selection logic local to the existing log viewer surface. Clipboard failures, including unsupported environments or denied access, will be caught and ignored so the log panel never disrupts operator workflows.

Alternatives considered:
- Add an explicit copy button for selected text. Rejected because it adds extra UI and does not satisfy the no-shortcut convenience requirement.
- Copy continuously on selection change. Rejected because it would be noisier, harder to reason about, and more likely to capture transient partial selections.

### Use a dashboard-owned boolean state as the source of truth for stream intent
The dashboard store will own `cameraStreamEnabled` with a default of `true`, and the PiP header toggle button will both update that state and publish the new value.

This keeps the button icon, tooltip text, and downstream `CameraStream` rendering synchronized from one state source. It also allows the camera component to be controlled declaratively through an `enabled` prop rather than embedding publishing logic or hidden local state inside the rendering component.

Alternatives considered:
- Derive toggle state only from button clicks without storing it centrally. Rejected because multiple camera-related components already coordinate through shared dashboard state.
- Infer enabled state from ROS messages or firmware feedback. Rejected because there is no acknowledgement channel in scope and the requested design treats the dashboard state as the operator's current intent.

### Use `std_msgs/msg/Bool` on `/cam/stream_enable` for runtime control
The web app will publish a Bool message on `/cam/stream_enable`, and the ESP32-CAM firmware will subscribe to that topic and update a global `stream_enabled` flag.

This follows established ROS topic patterns, keeps implementation simple across TypeScript and micro-ROS C/C++, and avoids adding a request-response API for a single binary control. It also aligns with the decision to keep the camera connected even when streaming is disabled.

Alternatives considered:
- Use a ROS service for enable and disable commands. Rejected because it adds more setup complexity and does not provide meaningful value for a fire-and-forget toggle.
- Tear down the camera connection entirely when disabled. Rejected because reconnecting is slower and outside the intended scope.

### Gate capture work in firmware and subscription work in the web app
When the stream is disabled, the firmware will skip frame capture and frame publication inside `handle_stream()` and only sleep for the frame interval. On the web side, the camera stream component will render a placeholder and avoid active topic subscription behavior while disabled.

This reduces unnecessary work on both ends while preserving a predictable UI state. The placeholder makes the disabled condition explicit to the operator, and the firmware-side delay prevents a busy loop when streaming is off.

Alternatives considered:
- Keep the frontend subscribed while only stopping firmware capture. Rejected because the UI should also reflect the off state rather than showing a stale canvas.
- Keep capturing but drop outgoing frames. Rejected because it wastes ESP32-CAM resources and contradicts the bandwidth and processing savings goal.

## Risks / Trade-offs

- Clipboard APIs can fail silently in some browsers or non-secure contexts. → Mitigation: treat copy as best-effort, skip empty selections, and swallow errors so the log monitor remains usable.
- Dashboard toggle state may temporarily diverge from firmware state if the publish path is unavailable. → Mitigation: keep scope to operator intent and preserve a deterministic local UI state; deeper acknowledgement handling is explicitly out of scope.
- Conditionally bypassing topic subscription in the camera component can be sensitive to hook usage patterns. → Mitigation: implement the disabled path with a component structure that preserves React hook correctness while still preventing active stream rendering.
- Disabling capture while keeping the connection alive may leave the last visible frame on screen if the UI does not fully swap to placeholder mode. → Mitigation: drive rendering from the explicit `enabled` prop so the placeholder always replaces the canvas when disabled.

## Migration Plan

This change is additive and does not require data migration. Deploy the dashboard and firmware updates together so the new UI control has a subscribing firmware peer, but partial rollout is still safe: the dashboard can publish a Bool topic even if older firmware ignores it, and updated firmware will default `stream_enabled` to `true` to preserve current behavior until a toggle command is received.

Rollback can be done by reverting the dashboard and firmware changes independently. If only the dashboard is rolled back, the firmware continues streaming by default. If only the firmware is rolled back, the dashboard toggle becomes a no-op at the device level but does not break the application.

## Open Questions

- None. The requested topic name, UI placement, default state, and silent failure behavior are already defined.
