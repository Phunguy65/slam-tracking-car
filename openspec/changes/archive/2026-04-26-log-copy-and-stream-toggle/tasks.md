# Tasks

## 1. Dashboard log monitor auto-copy

- [x] 1.1 Add a mouseup handler to `/home/PNguyen/Workspace/MyProject/slam-tracking-car/app/src/components/dashboard/log-monitor.tsx` that reads the trimmed browser text selection from the log monitor scroll region.
- [x] 1.2 Attempt clipboard writes only for non-empty selections and swallow unsupported clipboard or write errors without visible feedback. ← (verify: drag-selecting log text copies content, empty selections do nothing, and clipboard failures do not surface UI errors)

## 2. Dashboard camera stream toggle

- [x] 2.1 Extend `/home/PNguyen/Workspace/MyProject/slam-tracking-car/app/src/stores/dashboard-store.ts` with `cameraStreamEnabled` defaulting to `true` and a `setCameraStreamEnabled` action.
- [x] 2.2 Update `/home/PNguyen/Workspace/MyProject/slam-tracking-car/app/src/components/viewport/picture-in-picture.tsx` to add the stream toggle button, wire it to dashboard state, publish `std_msgs/msg/Bool` on `/cam/stream_enable`, and pass the enabled state into `CameraStream`.
- [x] 2.3 Update `/home/PNguyen/Workspace/MyProject/slam-tracking-car/app/src/components/tracking/camera-stream.tsx` so disabled mode shows the `Stream Off` placeholder and enabled mode preserves normal stream rendering without hook misuse. ← (verify: PiP header shows the fourth button with correct icon/labels, toggling updates the placeholder state, and the published Bool matches the visible state)

## 3. ESP32-CAM stream control

- [x] 3.1 Update `/home/PNguyen/Workspace/MyProject/slam-tracking-car/firmware/src/cam_main.cpp` to declare the Bool message include, stream-enabled flag, subscription entity, and callback.
- [x] 3.2 Initialize the `/cam/stream_enable` subscriber in setup, increase executor handle capacity, and register the subscription with the executor.
- [x] 3.3 Gate frame capture and publication in `handle_stream()` on the stream-enabled flag while delaying for the normal frame interval when disabled. ← (verify: firmware stays connected, stops capturing after `false`, resumes after `true`, and does not busy loop while disabled)
