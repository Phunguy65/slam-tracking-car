# SLAM Tracking Car

ROS2 Humble robot with two operating modes:

- **Face Tracking**: ESP32-CAM detects faces, robot follows
- **SLAM + Navigation**: LiDAR (LDS02RR) mapping + autonomous navigation between waypoints

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

| Launch file               | Description                                 |
| ------------------------- | ------------------------------------------- |
| `simulation.launch.py`    | Gazebo Fortress + robot + RViz2             |
| `robot.launch.py`         | Real robot: micro-ROS agent + camera bridge |
| `slam.launch.py`          | Robot + SLAM Toolbox (mapping)              |
| `navigation.launch.py`    | Robot + Nav2 (autonomous navigation)        |
| `face_tracking.launch.py` | Robot + face detection + follow controller  |

## ESP32 Firmware

Flash from inside Distrobox:

```bash
distrobox enter slam-dev
cd firmware

# Copy and edit environment config
cp .env.example .env
# Edit .env: WiFi credentials, micro-ROS agent IP, GPIO pin assignments

# Flash main board (uses .env by default)
pio run -e esp32_main -t upload

# Flash camera board
pio run -e esp32_cam -t upload
```

## Build and verify

Always begin:

```sh
distrobox enter slam-dev
source /opt/ros/humble/setup.zsh && source /uros_ws/install/setup.sh && source /explore_ws/install/setup.zsh && source install/setup.zsh
colcon build
```

### Multi-Environment Support

Create separate env files for different locations:

```bash
cp .env .env.home    # Home WiFi config
cp .env .env.lab     # Lab WiFi config

# Build for specific environment
pio run -e esp32_main_home -t upload
pio run -e esp32_main_lab -t upload
pio run -e esp32_cam_home -t upload
pio run -e esp32_cam_lab -t upload
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
