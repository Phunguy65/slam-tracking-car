#!/bin/bash
###############################################################################
# SLAM Tracking Car — First-time setup (run once inside Distrobox)
#
# Usage:
#   distrobox enter slam-dev
#   bash .devcontainer/setup.sh
#
# What it does:
#   1. Auto-builds the Podman image if not present
#   2. Initializes rosdep
#   3. Installs ROS2 package dependencies
#   4. Runs first colcon build
#   5. Adds user to dialout group (for ESP32 flashing)
###############################################################################
set -e

# ── Resolve repo root from script location ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== SLAM Tracking Car — First-time Setup ==="
echo "Repo: $REPO_DIR"
echo ""

# ── Auto-build image (if run on HOST before distrobox create) ────────────────
if command -v podman &>/dev/null && [ -z "$DISTROBOX_ENTER_PATH" ]; then
    IMAGE_NAME="ros2-slam"
    if ! podman image exists "$IMAGE_NAME" 2>/dev/null; then
        echo "Image '$IMAGE_NAME' not found. Building..."
        podman build -t "$IMAGE_NAME" -f "$REPO_DIR/.devcontainer/Dockerfile" "$REPO_DIR"
        echo ""
        echo "Image built. Now create and enter the Distrobox:"
        echo "  distrobox assemble create --file $REPO_DIR/distrobox.ini"
        echo "  distrobox enter slam-dev"
        echo "  bash .devcontainer/setup.sh"
        exit 0
    else
        echo "Image '$IMAGE_NAME' already exists. Skipping build."
        echo "To rebuild: podman build -t $IMAGE_NAME -f .devcontainer/Dockerfile ."
        echo ""
    fi
fi

# ── From here on, we expect to be inside Distrobox ──────────────────────────
if [ -z "$DISTROBOX_ENTER_PATH" ]; then
    echo "WARNING: Not running inside Distrobox."
    echo "  Run: distrobox enter slam-dev"
    echo "  Then: bash .devcontainer/setup.sh"
    echo ""
    echo "Continuing anyway (may work in a plain container)..."
fi

# ── rosdep ───────────────────────────────────────────────────────────────────
echo "--- Initializing rosdep ---"
if [ ! -f /etc/ros/rosdep/sources.list.d/20-default.list ]; then
    sudo rosdep init 2>/dev/null || true
fi
rosdep update --rosdistro humble

# ── Install dependencies from ROS2 packages in workspace ─────────────────────
echo ""
echo "--- Installing ROS2 package dependencies ---"
if [ -d "$REPO_DIR/src" ]; then
    rosdep install --from-paths "$REPO_DIR/src" --ignore-src -y 2>/dev/null || true
fi

# ── First colcon build ───────────────────────────────────────────────────────
echo ""
echo "--- Building ROS2 workspace ---"
cd "$REPO_DIR"
if find src -name "package.xml" -print -quit 2>/dev/null | grep -q .; then
    source /opt/ros/humble/setup.bash
    colcon build --symlink-install
else
    echo "No ROS2 packages found in src/. Skipping build."
fi

# ── Serial port permissions ──────────────────────────────────────────────────
echo ""
echo "--- Configuring serial port access ---"
sudo usermod -aG dialout "$(whoami)" 2>/dev/null || true
echo "Added $(whoami) to dialout group (re-login to take effect)"

# ── X11 display check ───────────────────────────────────────────────────────
echo ""
if [ -n "$DISPLAY" ]; then
    echo "DISPLAY=$DISPLAY — GUI forwarding available"
else
    echo "WARNING: DISPLAY not set — GUI tools (RViz2, Gazebo) will not work"
    echo "Distrobox should forward DISPLAY automatically."
    echo "If not, check: echo \$DISPLAY on host"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup complete ==="
echo ""
echo "Quick start:"
echo "  source install/setup.bash                              # Source workspace"
echo "  ros2 launch slam_car_bringup simulation.launch.py      # Gazebo sim"
echo "  ros2 launch slam_car_bringup robot.launch.py           # Real robot"
echo "  cd firmware && pio run -e esp32_main -t upload          # Flash ESP32"
echo ""
echo "VS Code:"
echo "  Option A: On host, F1 → 'Attach to Running Container' → slam-dev"
echo "  Option B: Inside Distrobox, run: code ."
echo ""
