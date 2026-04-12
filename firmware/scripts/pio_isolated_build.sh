#!/bin/bash
# =============================================================================
# PlatformIO Isolated Build Script
#
# Runs PlatformIO in a clean environment to prevent micro_ros_platformio
# from detecting and conflicting with system ROS2 installation.
#
# Usage:
#   ./scripts/pio_isolated_build.sh                    # Build esp32_main
#   ./scripts/pio_isolated_build.sh -e esp32_cam       # Build esp32_cam
#   ./scripts/pio_isolated_build.sh -t upload          # Build and upload
#
# Why this is needed:
#   micro_ros_platformio builds micro-ROS from source using colcon/CMake.
#   If system ROS2 is sourced, CMake's find_package() discovers system
#   packages (x86-64) instead of letting micro-ROS build its own ESP32
#   compatible libraries, causing link errors.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIRMWARE_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================================================"
echo " Isolated PlatformIO Build"
echo "========================================================================"
echo ""
echo "Firmware directory: $FIRMWARE_DIR"
echo "Running in clean environment (no ROS2 variables)"
echo ""

# Run pio in a completely clean environment
# Only pass essential variables needed for the build
cd "$FIRMWARE_DIR"

env -i \
    HOME="$HOME" \
    USER="$USER" \
    SHELL="$SHELL" \
    TERM="$TERM" \
    PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.platformio/penv/bin:$HOME/.local/bin" \
    LANG="${LANG:-en_US.UTF-8}" \
    LC_ALL="${LC_ALL:-}" \
    pio run "$@"

echo ""
echo "========================================================================"
echo " Build completed successfully!"
echo "========================================================================"
