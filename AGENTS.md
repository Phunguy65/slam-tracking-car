# SLAM Tracking Car

ROS2 Humble robot with two operating modes:
- **Face Tracking**: ESP32-CAM detects faces, robot follows
- **SLAM + Navigation**: LiDAR (LDS02RR) mapping + autonomous navigation between waypoints

## Prerequisites (Host)

- **Linux** (Ubuntu, Fedora, Arch, NixOS, etc.)
- [Podman](https://podman.io/docs/installation) (v2.1.0+)
- [Distrobox](https://distrobox.it/#installation) (v1.4+)
- User in `dialout` group (for ESP32 USB flashing):
  ```bash
  sudo usermod -aG dialout $USER
  # Log out and back in
  ```

> **macOS/Windows**: Not supported via Distrobox. Use DevContainer (VS Code/Zed) or the Dockerfile directly.

## Quick Start

### Option 1: DevContainer (VS Code / Zed) — Recommended

```bash
# 1. Clone
git clone <repo-url> slam_tracking_car
cd slam_tracking_car

# 2. Open in VS Code or Zed
#    VS Code: F1 → "Dev Containers: Reopen in Container"
#    Zed:     "Open in Dev Container" prompt on folder open

# 3. Wait for container build + setup (first time ~10 min)
#    Subsequent opens are instant.

# 4. Start developing
colcon build
source install/setup.bash
ros2 launch slam_car_bringup simulation.launch.py    # Gazebo sim
```

**Zed users with Podman**: Add to Zed settings:
```json
{
  "dev_containers": { "use_podman": true }
}
```
Note: Zed does not auto-install extensions from devcontainer.json yet. Install extensions manually.

**GUI apps (RViz2, Gazebo)**: Run on host before opening container:
```bash
xhost +local:   # Allow container to access X11 (works with Podman)
```

### Option 2: Distrobox (Linux terminal workflow)

```bash
# 1. Clone
git clone <repo-url> slam_tracking_car
cd slam_tracking_car

# 2. First-time setup (builds image + creates distrobox + installs deps)
bash .devcontainer/setup.sh
distrobox assemble create --file distrobox.ini
distrobox enter slam-dev
bash .devcontainer/setup.sh

# 3. Daily workflow
distrobox enter slam-dev
colcon build
source install/setup.bash
ros2 launch slam_car_bringup simulation.launch.py    # Gazebo sim
ros2 launch slam_car_bringup robot.launch.py          # Real robot
```

## VS Code

Two ways to connect:

**Option A** — Attach from host:
1. Start container: `distrobox enter slam-dev` (keep terminal open)
2. In VS Code: `F1` -> `Dev Containers: Attach to Running Container` -> select `slam-dev`

**Option B** — Launch from inside container:
```bash
distrobox enter slam-dev
cd /path/to/slam_tracking_car
code .
```

Recommended extensions are listed in `.vscode/extensions.json` and will be suggested on first open.

## Project Structure

```
slam_tracking_car/              # Git root = colcon workspace root
├── src/                        # ROS2 packages
│   ├── slam_car_bringup/       #   Launch files, config, URDF, worlds
│   ├── slam_car_perception/    #   Camera bridge, face detection, control
│   └── slam_car_interfaces/    #   Custom messages and services
├── firmware/                   # ESP32 PlatformIO projects
│   ├── src/main.cpp            #   Main board (LiDAR + motors + micro-ROS)
│   ├── src/cam_main.cpp        #   ESP32-CAM (MJPEG stream + micro-ROS)
│   └── platformio.ini
├── legacy/                     # Old Python+MQTT code (reference only)
├── .devcontainer/
│   ├── Dockerfile              #   ROS2 Humble image definition
│   ├── devcontainer.json       #   VS Code + Zed container config
│   └── setup.sh                #   First-time setup script
├── distrobox.ini               # Distrobox container definition
├── docker-compose.yml          # Optional: standalone micro-ROS agent
├── build/                      # colcon output (gitignored)
├── install/                    # colcon output (gitignored)
└── log/                        # colcon output (gitignored)
```

## Launch Files

| Launch file | Description |
|---|---|
| `simulation.launch.py` | Gazebo Fortress + robot + RViz2 |
| `robot.launch.py` | Real robot: micro-ROS agent + camera bridge |
| `slam.launch.py` | Robot + SLAM Toolbox (mapping) |
| `navigation.launch.py` | Robot + Nav2 (autonomous navigation) |
| `face_tracking.launch.py` | Robot + face detection + follow controller |

## ESP32 Firmware

Flash from inside Distrobox:

```bash
distrobox enter slam-dev
cd firmware

# Copy and edit config
cp include/config.h.example include/config.h
# Edit config.h: WiFi credentials, micro-ROS agent IP, pin assignments

# Flash main board
pio run -e esp32_main -t upload

# Flash camera board
pio run -e esp32_cam -t upload
```

## Rebuilding

When `Dockerfile` changes:
```bash
podman build -t ros2-slam -f .devcontainer/Dockerfile .
distrobox rm slam-dev
distrobox assemble create --file distrobox.ini
distrobox enter slam-dev
bash .devcontainer/setup.sh
```

Build artifacts (`build/`, `install/`) persist in the repo directory and survive container rebuilds, so subsequent `colcon build` runs are incremental.

## Key Technologies

- **ROS2 Humble** on Ubuntu 22.04
- **CycloneDDS** for DDS transport
- **SLAM Toolbox** (async mapping)
- **Nav2** (autonomous navigation)
- **Gazebo Fortress** + ros_gz_bridge (simulation)
- **micro-ROS** (ESP32 <-> ROS2 bridge via UDP)
- **PlatformIO** (ESP32 firmware, espressif32 platform)
- **LDS02RR** LiDAR (via kaiaai/LDS driver)
- **MediaPipe** (face detection)
