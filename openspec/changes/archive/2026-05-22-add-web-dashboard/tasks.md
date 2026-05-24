# Tasks

## 1. ROS2 Backend Setup

- [x] 1.1 Add `ros-humble-rosbridge-suite` to `.devcontainer/Dockerfile`
- [x] 1.2 Add `ros-humble-image-transport-plugins` to `.devcontainer/Dockerfile`
- [x] 1.3 Clone and build `m-explore-ros2` from source in Dockerfile
- [x] 1.4 Create `dashboard.launch.py` with rosbridge_websocket node (port 9090)
- [x] 1.5 Add image_transport republisher node to dashboard launch for compressed camera
- [x] 1.6 Add m-explore (explore_lite) node to dashboard launch with SLAM mode
- [ ] 1.7 Rebuild devcontainer and verify rosbridge starts successfully (MANUAL)

## 2. Face Follow Controller Modification

- [x] 2.1 Add `add_on_set_parameters_callback()` to `face_follow_controller.py`
- [x] 2.2 Implement parameter validation (non-negative PID gains)
- [x] 2.3 Apply parameter changes to controller instance variables immediately
- [ ] 2.4 Test PID parameter updates via `ros2 param set` command (MANUAL)

## 3. Frontend Setup

- [x] 3.1 Run `bunx shadcn@canary init` in `app/` directory
- [x] 3.2 Configure dark theme with HUD color palette in `globals.css`
- [x] 3.3 Add JetBrains Mono font for data display
- [x] 3.4 Install shadcn components: Button, Tabs, Card, Slider, Switch, Badge
- [x] 3.5 Install `roslibjs` package via bun
- [x] 3.6 Install virtual joystick package (`react-joystick-component`)
- [x] 3.7 Create Zustand store for ROS connection state (`stores/ros-store.ts`)

## 4. ROS Communication Layer

- [x] 4.1 Create `lib/ros-client.ts` with roslib wrapper and auto-reconnection
- [x] 4.2 Create `hooks/use-ros.ts` for connection state access
- [x] 4.3 Create `hooks/use-topic.ts` for topic subscription with cleanup
- [x] 4.4 Create `hooks/use-service.ts` for service calls
- [x] 4.5 Create `hooks/use-action.ts` for action client (goal, cancel, feedback)
- [x] 4.6 Create `components/ros/ros-provider.tsx` context wrapper
- [x] 4.7 Create `components/ros/connection-status.tsx` badge component
- [x] 4.8 Create `components/ros/emergency-stop.tsx` with keyboard shortcut (Space)

## 5. Layout and Navigation

- [x] 5.1 Update `app/layout.tsx` with ROS provider and dark theme
- [x] 5.2 Create `components/layout/header.tsx` with logo, mode tabs, status, e-stop
- [x] 5.3 Create `components/layout/mode-selector.tsx` (Tracking / SLAM tabs)
- [x] 5.4 Update `app/page.tsx` as mode selector landing page
- [x] 5.5 Create `app/tracking/page.tsx` for tracking mode
- [x] 5.6 Create `app/slam/page.tsx` for SLAM mode with Mapping/Navigation sub-tabs

## 6. Tracking Mode Components

- [x] 6.1 Create `lib/compressed-image.ts` for decoding compressed image messages
- [x] 6.2 Create `components/tracking/camera-stream.tsx` with Canvas rendering
- [x] 6.3 Create `components/tracking/face-overlay.tsx` for bounding box rendering
- [x] 6.4 Create `components/tracking/tracking-controls.tsx` with start/stop toggle
- [x] 6.5 Create `components/tracking/tracking-status.tsx` for confidence/distance display
- [x] 6.6 Create `components/tracking/pid-tuner.tsx` with debounced sliders
- [x] 6.7 Integrate all tracking components in `app/tracking/page.tsx`

## 7. SLAM Mapping Components

- [x] 7.1 Create `lib/occupancy-grid.ts` for parsing OccupancyGrid to Canvas
- [x] 7.2 Create `lib/laser-scan.ts` for parsing LaserScan to radar points
- [x] 7.3 Create `lib/tf-listener.ts` for listening to TF transforms
- [x] 7.4 Create `components/slam/occupancy-map.tsx` with Canvas rendering
- [x] 7.5 Create `components/slam/robot-marker.tsx` for position/heading overlay
- [x] 7.6 Create `components/slam/lidar-radar.tsx` with full scan visualization
- [x] 7.7 Create `components/slam/manual-joystick.tsx` publishing to cmd_vel
- [x] 7.8 Create `components/slam/explore-toggle.tsx` for m-explore action control
- [x] 7.9 Create `components/slam/save-map-button.tsx` calling slam_toolbox service
- [x] 7.10 Create `components/slam/map-selector.tsx` for listing/loading saved maps

## 8. SLAM Navigation Components

- [x] 8.1 Create `components/slam/initial-pose-setter.tsx` for click-to-set-pose
- [x] 8.2 Create `components/slam/goal-setter.tsx` for click-to-navigate
- [x] 8.3 Create `components/slam/navigation-status.tsx` for goal progress display
- [x] 8.4 Integrate mapping components in SLAM page Mapping tab
- [x] 8.5 Integrate navigation components in SLAM page Navigation tab

## 9. TypeScript Types

- [x] 9.1 Create `types/ros-messages.ts` with types for all used ROS message types
- [x] 9.2 Add types for CompressedImage, OccupancyGrid, LaserScan, PoseArray
- [x] 9.3 Add types for Twist, PoseWithCovarianceStamped, NavigateToPose action

## 10. Integration and Polish

- [x] 10.1 Run `bun run lint:fix` and fix any linting errors
- [x] 10.2 Run `bun run build` and verify successful build
- [ ] 10.3 Test tracking mode with ESP32-CAM stream (MANUAL)
- [ ] 10.4 Test SLAM mapping with LiDAR and manual joystick (MANUAL)
- [ ] 10.5 Test frontier exploration start/stop (MANUAL)
- [ ] 10.6 Test navigation with saved map and click-to-navigate (MANUAL)
- [ ] 10.7 Test emergency stop functionality (button and keyboard) (MANUAL)
- [ ] 10.8 Test reconnection behavior when rosbridge disconnects (MANUAL)
