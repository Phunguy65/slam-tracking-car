###############################################################################
# SLAM Tracking Car — ROS2 Humble (Distrobox image)
#
# Usage:
#   podman build -t ros2-slam -f .devcontainer/Dockerfile .
#   distrobox assemble create --file distrobox.ini
#   distrobox enter slam-dev
#
# Base:  osrf/ros:humble-desktop (Ubuntu 22.04 + RViz2 + RQT)
# DDS:   CycloneDDS
# SLAM:  slam_toolbox (async)
# Nav:   Navigation2
# Sim:   Gazebo Fortress + ros_gz_bridge
# LiDAR: kaiaai/LDS (LDS02RR) via micro-ROS on ESP32
# FW:    PlatformIO (espressif32@2.0.18, Arduino framework)
#
# NOTE: Distrobox ignores the user created below and injects the host user.
#       DevContainer uses the "vscode" user via remoteUser config.
#       Shell env is set via /etc/profile.d/ (applies to all users).
###############################################################################
FROM docker.io/osrf/ros:humble-desktop

ENV DEBIAN_FRONTEND=noninteractive

# ── Layer 1: System prerequisites ────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl wget vim nano sudo \
    lsb-release gnupg2 software-properties-common \
    python3-pip python3-colcon-common-extensions \
    python3-rosdep python3-vcstool \
    python3-serial \
    gdb clang-format \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2: SLAM + Navigation2 ─────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-humble-navigation2 \
    ros-humble-nav2-bringup \
    ros-humble-slam-toolbox \
    ros-humble-robot-localization \
    ros-humble-tf2-tools \
    ros-humble-tf-transformations \
    ros-humble-rmw-cyclonedds-cpp \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 3: Vision + Face tracking ─────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-humble-cv-bridge \
    ros-humble-image-transport \
    ros-humble-vision-opencv \
    ros-humble-camera-info-manager \
    && rm -rf /var/lib/apt/lists/*

# Use system OpenCV from ros-humble-vision-opencv (do NOT install pip opencv —
# it conflicts with the ABI that cv_bridge was built against).
# mediapipe bundles its own opencv-contrib subset, which is compatible.
RUN pip3 install --no-cache-dir \
    mediapipe \
    requests

# ── Layer 3b: Person tracking (YOLOv8 + InsightFace) ─────────────────────────
# ultralytics: YOLOv8 for body/face detection
# insightface: Face recognition and embedding extraction
# onnxruntime: CPU inference backend for InsightFace
#
# IMPORTANT: Pin numpy<2 IN THE SAME COMMAND.
# InsightFace wheels are compiled against NumPy 1.x C-API.
# NumPy 2.0 changed the ABI (dtype size 96 vs 88), causing:
#   "ValueError: numpy.dtype size changed, may indicate binary incompatibility"
RUN pip3 install --no-cache-dir \
    "numpy<2" \
    ultralytics \
    insightface \
    onnxruntime \
    && pip3 uninstall -y opencv-python opencv-python-headless opencv-contrib-python

# Pre-download models to avoid runtime delays on first use
# YOLOv8n is ~6MB, InsightFace buffalo_l is ~500MB
RUN python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" && \
    python3 -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); app.prepare(ctx_id=-1)"

# ── Layer 4: Gazebo Fortress + ROS bridge ────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-humble-ros-gz \
    ros-humble-xacro \
    ros-humble-joint-state-publisher-gui \
    ros-humble-robot-state-publisher \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 5: micro-ROS Agent ────────────────────────────────────────────────
# Try apt first; fall back to building from source if not available
RUN apt-get update && \
    (apt-get install -y --no-install-recommends ros-humble-micro-ros-agent || \
    echo "micro-ros-agent not in apt, building from source..." && \
    mkdir -p /uros_ws/src && \
    cd /uros_ws/src && \
    git clone -b humble https://github.com/micro-ROS/micro_ros_setup.git && \
    cd /uros_ws && \
    . /opt/ros/humble/setup.sh && \
    colcon build --packages-select micro_ros_setup && \
    . install/setup.sh && \
    ros2 run micro_ros_setup create_agent_ws.sh && \
    ros2 run micro_ros_setup build_agent.sh) && \
    rm -rf /var/lib/apt/lists/*

# ── Layer 6: PlatformIO CLI ─────────────────────────────────────────────────
RUN pip3 install --no-cache-dir platformio

# ── Layer 7: Dev + teleop tools ──────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-humble-rqt-robot-steering \
    ros-humble-teleop-twist-keyboard \
    ros-humble-plotjuggler-ros \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 8: Web dashboard dependencies ──────────────────────────────────────
# rosbridge: WebSocket bridge for ROS2 ↔ web communication
# image_transport_plugins: JPEG compression for camera streaming
RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-humble-rosbridge-suite \
    ros-humble-image-transport-plugins \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 9: m-explore (frontier exploration) ────────────────────────────────
# Build from source — not available in apt for Humble
# Pin to known-working commit for stability
RUN mkdir -p /explore_ws/src && \
    cd /explore_ws/src && \
    git clone https://github.com/robo-friends/m-explore-ros2.git && \
    cd /explore_ws && \
    . /opt/ros/humble/setup.sh && \
    colcon build --packages-up-to explore_lite && \
    rm -rf /explore_ws/log /explore_ws/build

# ── Layer 10: Shell environment (all users — Distrobox injects host user) ────
# /etc/profile.d/ runs on every login shell; Distrobox uses login shells.
RUN printf '#!/bin/bash\n\
# ROS2 Humble base\n\
source /opt/ros/humble/setup.bash\n\
\n\
# micro-ROS agent workspace (if built from source)\n\
[ -f /uros_ws/install/setup.bash ] && source /uros_ws/install/setup.bash\n\
\n\
# m-explore workspace (frontier exploration)\n\
[ -f /explore_ws/install/setup.bash ] && source /explore_ws/install/setup.bash\n\
\n\
# User workspace overlay (colcon install space)\n\
# Detect workspace root: walk up from CWD looking for src/ with package.xml\n\
__ros2_ws_dir="$PWD"\n\
while [ "$__ros2_ws_dir" != "/" ]; do\n\
    if [ -f "$__ros2_ws_dir/install/setup.bash" ]; then\n\
        source "$__ros2_ws_dir/install/setup.bash"\n\
        break\n\
    fi\n\
    __ros2_ws_dir="$(dirname "$__ros2_ws_dir")"\n\
done\n\
unset __ros2_ws_dir\n\
\n\
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp\n\
export RCUTILS_COLORIZED_OUTPUT=1\n' > /etc/profile.d/ros2-env.sh && \
    chmod +x /etc/profile.d/ros2-env.sh

# Colcon defaults (system-wide): always use --symlink-install
RUN mkdir -p /etc/colcon && \
    echo '{"build": {"symlink-install": true}}' > /etc/colcon/defaults.yaml

# ── DevContainer user (ignored by Distrobox, used by VS Code/Zed) ────────────
# Distrobox injects the host user automatically; this user is only for DevContainer.
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && usermod -aG dialout $USERNAME

# Create .slam_car directory for face database (for vscode user in DevContainer)
# Distrobox users will have this created on first run via enrollment_node
RUN mkdir -p /home/$USERNAME/.slam_car && \
    chown $USERNAME:$USERNAME /home/$USERNAME/.slam_car

# ── Environment defaults (available in all shells, not just login) ───────────
ENV RMW_IMPLEMENTATION=rmw_cyclonedds_cpp
ENV ROS_DOMAIN_ID=42
ENV QT_X11_NO_MITSHM=1
ENV RCUTILS_COLORIZED_OUTPUT=1
# Note: LIBGL_ALWAYS_SOFTWARE removed to allow GPU acceleration.
# For headless/CI environments without GPU, set it via containerEnv.
