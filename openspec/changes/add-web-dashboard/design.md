# Context

The SLAM Tracking Car robot currently requires ROS2 expertise to operate — users must run RViz2 or use `ros2 topic pub` commands. The existing Next.js app scaffold (`app/`) is empty. A legacy Python+Flask dashboard exists at `legacy/api/dashboard.py` with dark glassmorphism styling that serves as the design reference.

The robot has two primary modes:
1. **Face Tracking**: ESP32-CAM streams video, MediaPipe detects faces, robot follows
2. **SLAM + Navigation**: LDS02RR LiDAR maps environment, Nav2 handles autonomous navigation

The web dashboard must bridge the gap between ROS2 complexity and operator usability, supporting both modes through an intuitive interface accessible from desktop and tablet browsers.

## Goals / Non-Goals

**Goals:**
- Enable remote robot control via web browser (desktop + tablet, 768px+)
- Support real-time visualization of camera, LiDAR, and map data
- Provide mode switching between Face Tracking and SLAM operations
- Allow live PID parameter tuning for face tracking controller
- Enable frontier-based autonomous exploration during mapping
- Maintain always-accessible emergency stop functionality

**Non-Goals:**
- Mobile phone support (< 768px) — deferred to future version
- Multi-robot fleet management — single robot only
- User authentication — local network trusted environment
- Offline operation — requires active rosbridge connection
- E2E/unit testing — manual testing for v1

## Decisions

### 1. Communication: rosbridge_suite (WebSocket)

**Decision:** Use `rosbridge_suite` with `roslibjs` for all ROS2 communication.

**Alternatives considered:**
- Custom REST API (FastAPI + rclpy): More control but requires implementing protocol layer
- gRPC-Web: Better performance but poor ROS2 ecosystem support

**Rationale:** rosbridge is the standard ROS-to-web bridge. It provides topic pub/sub, service calls, and action clients out-of-box. The WebSocket protocol enables real-time streaming required for camera and LiDAR data.

### 2. Frontend Stack: Next.js 16 + React 19 + shadcn/ui

**Decision:** Build on existing Next.js scaffold with shadcn/ui components.

**Alternatives considered:**
- Port legacy inline HTML/JS: Fast but unmaintainable, no component reuse
- Vue/Svelte: Would require new toolchain setup

**Rationale:** Project already has Next.js 16 + React 19 + Tailwind 4 configured. shadcn/ui provides accessible, customizable components that work with Tailwind. The legacy dashboard's dark glassmorphism can be modernized into a cleaner "HUD" style.

### 3. Camera Streaming: Compressed JPEG via image_transport

**Decision:** Use `/camera/image_raw/compressed` topic instead of raw BGR8 frames.

**Alternatives considered:**
- Raw `/camera/image_raw`: ~9MB/s bandwidth, will saturate WebSocket
- Reduce FPS to 5: Loses smoothness, still high bandwidth

**Rationale:** JPEG compression reduces ~900KB frames to ~50KB. Requires adding `image_transport` republisher node to launch file but significantly improves performance.

### 4. Manual Control: Virtual Joystick

**Decision:** Replace legacy D-pad with virtual joystick component.

**Alternatives considered:**
- Port legacy D-pad: Discrete 8-direction control
- Keyboard-only: Not suitable for tablet

**Rationale:** Virtual joystick maps directly to `cmd_vel` (linear.x, angular.z), providing continuous 360-degree control. Better matches differential drive kinematics than discrete D-pad steps.

### 5. High-Frequency Data Rendering: Canvas + useRef

**Decision:** Render LiDAR, map, and camera data directly to Canvas, bypassing React state.

**Alternatives considered:**
- React state + SVG: Causes cascading re-renders, 10-15 FPS max
- WebGL: Overkill for 2D visualization

**Rationale:** ROS topics publish at 5-50 Hz. Using `useState` for this data would freeze the UI. Canvas with `useRef` enables 60 FPS rendering while React manages only UI controls.

### 6. Frontier Exploration: m-explore-ros2

**Decision:** Build `m-explore-ros2` from source for autonomous mapping.

**Alternatives considered:**
- Custom frontier detection: Simpler but requires significant development
- Manual-only mapping: Functional but tedious for large areas

**Rationale:** m-explore is battle-tested, integrates with Nav2, and provides the `explore_lite/Explore` action interface. Build-from-source adds ~5-10 min to container build but delivers full autonomous exploration.

### 7. State Management: Zustand for ROS connection

**Decision:** Use Zustand store for rosbridge connection state; useRef for telemetry.

**Alternatives considered:**
- React Context only: Re-renders entire tree on connection state change
- Redux: Overkill for this use case

**Rationale:** Zustand provides lightweight global state with selective subscriptions. Connection status (connected/disconnected) needs React re-renders. Telemetry data (poses, scans) should bypass React entirely via refs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      React Component Tree                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │  Header  │  │  Mode    │  │  E-Stop  │  │  Connection      │ │   │
│  │  │          │  │  Tabs    │  │  Button  │  │  Status Badge    │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────────┐│   │
│  │  │                     Mode-Specific View                       ││   │
│  │  │  Tracking: Camera + Overlay + Controls + PID                 ││   │
│  │  │  SLAM:     Map + Radar + Joystick + Explore + Save/Load     ││   │
│  │  └──────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘│
│                                   │                                     │
│  ┌────────────────────────────────┼────────────────────────────────┐   │
│  │              roslib.js (WebSocket Client)                        │   │
│  │  • Topic subscribers (camera, map, scan, tf, face_detections)   │   │
│  │  • Topic publishers (cmd_vel, initialpose)                       │   │
│  │  • Service clients (set_parameters, save_map, set_mode)         │   │
│  │  • Action clients (navigate_to_pose, explore)                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket :9090
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        rosbridge_websocket                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Face Tracking    │      │ SLAM Toolbox     │      │ Nav2 Stack       │
│ • cam_bridge     │      │ • slam_toolbox   │      │ • AMCL           │
│ • face_tracker   │      │ • m-explore      │      │ • planner        │
│ • face_follow    │      │                  │      │ • controller     │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

## File Structure

```
app/src/
├── app/
│   ├── layout.tsx              # Root layout + ROS provider
│   ├── page.tsx                # Mode selector landing
│   ├── tracking/page.tsx       # Face tracking mode
│   └── slam/page.tsx           # SLAM mode (mapping + navigation tabs)
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── ros/                    # ROS-specific (provider, status, e-stop)
│   ├── tracking/               # Camera, face overlay, PID tuner
│   ├── slam/                   # Map, radar, joystick, explore, goal setter
│   └── layout/                 # Header, mode selector
├── hooks/
│   ├── use-ros.ts              # ROS connection hook
│   ├── use-topic.ts            # Topic subscription
│   ├── use-service.ts          # Service client
│   └── use-action.ts           # Action client
├── lib/
│   ├── ros-client.ts           # roslib wrapper + reconnection
│   ├── occupancy-grid.ts       # OccupancyGrid → Canvas
│   └── laser-scan.ts           # LaserScan → radar points
└── stores/
    └── ros-store.ts            # Zustand store for connection state
```

## Risks / Trade-offs

**[Risk] m-explore build failure** → Mitigation: Pin to known-working commit. Fallback: manual-only mapping if build fails.

**[Risk] Camera bandwidth saturation** → Mitigation: Compressed JPEG + throttling. Monitor WebSocket buffer.

**[Risk] rosbridge disconnection during navigation** → Mitigation: Robot continues last command for 500ms, then stops. UI shows reconnection status.

**[Risk] TF lookup failures** → Mitigation: Cache last known robot pose. Show "Pose Unknown" indicator after 2s staleness.

**[Trade-off] No authentication** — Acceptable for local network. Document that dashboard should not be exposed to public internet.

**[Trade-off] Build-from-source m-explore** — Adds container build time but enables autonomous exploration v1.

## Open Questions

1. **Map storage location**: Should saved maps go to `src/slam_car_bringup/maps/` or a new `maps/` directory at workspace root?
   - **Decision**: Use existing `src/slam_car_bringup/maps/` for consistency with Nav2 launch file expectations.

2. **SetMode service node**: The `slam_car_interfaces/SetMode` service exists but no node implements it yet. Should dashboard call this service or manage mode state internally?
   - **Decision**: Dashboard manages mode state internally for v1. SetMode service integration deferred to v2 when mode arbitration node is implemented.
