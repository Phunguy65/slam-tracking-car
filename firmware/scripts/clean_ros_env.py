"""
PlatformIO Pre-Build Script: Clean ROS2 Environment Variables

This script runs before PlatformIO builds to remove ROS2 environment variables
that can interfere with micro_ros_platformio's CMake build process.

Problem: When system ROS2 is sourced (e.g., /opt/ros/humble/setup.bash),
CMake's find_package() discovers host x86-64 ROS2 libraries instead of
letting micro_ros_platformio build its own ESP32-compatible libraries.

Solution: Remove ROS2 env vars from the build process environment.

Usage in platformio.ini:
    extra_scripts = pre:scripts/clean_ros_env.py
"""

import os
import sys

# PlatformIO build system integration
Import("env")

# ROS2 environment variables that can cause conflicts
ROS2_ENV_VARS = [
    # Core ROS2 variables
    "ROS_DISTRO",
    "ROS_VERSION",
    "ROS_DOMAIN_ID",
    "ROS_LOCALHOST_ONLY",
    
    # Path variables that CMake uses to find packages
    "AMENT_PREFIX_PATH",
    "CMAKE_PREFIX_PATH",
    "COLCON_PREFIX_PATH",
    "ROS_PACKAGE_PATH",
    
    # Python/ament related
    "AMENT_CURRENT_PREFIX",
    # Note: PYTHONPATH is filtered surgically below, not deleted entirely
    
    # Workspace paths
    "COLCON_INSTALL_PREFIX",
]

# Additional paths to filter from PATH and PYTHONPATH
ROS2_PATH_PATTERNS = [
    "/opt/ros/",
    "/ros2_ws/",
    "/colcon_ws/",
]


def clean_ros2_environment():
    """Remove ROS2 environment variables from the current process."""
    
    removed_vars = []
    
    for var in ROS2_ENV_VARS:
        if var in os.environ:
            value = os.environ[var]
            del os.environ[var]
            removed_vars.append((var, value[:50] + "..." if len(value) > 50 else value))
    
    # Clean PATH: remove ROS2-related directories
    if "PATH" in os.environ:
        original_path = os.environ["PATH"]
        path_parts = original_path.split(os.pathsep)
        
        clean_parts = []
        removed_paths = []
        
        for part in path_parts:
            is_ros2_path = any(pattern in part for pattern in ROS2_PATH_PATTERNS)
            if is_ros2_path:
                removed_paths.append(part)
            else:
                clean_parts.append(part)
        
        if removed_paths:
            os.environ["PATH"] = os.pathsep.join(clean_parts)
            removed_vars.append(("PATH (filtered)", f"Removed {len(removed_paths)} ROS2 paths"))
    
    # Clean PYTHONPATH: surgically remove only ROS2 paths, preserve non-ROS packages
    if "PYTHONPATH" in os.environ:
        pp_parts = os.environ["PYTHONPATH"].split(os.pathsep)
        clean_pp = [p for p in pp_parts if not any(pat in p for pat in ROS2_PATH_PATTERNS)]
        removed_pp = [p for p in pp_parts if any(pat in p for pat in ROS2_PATH_PATTERNS)]
        
        if removed_pp:
            if clean_pp:
                os.environ["PYTHONPATH"] = os.pathsep.join(clean_pp)
            else:
                del os.environ["PYTHONPATH"]
            removed_vars.append(("PYTHONPATH (filtered)", f"Removed {len(removed_pp)} ROS2 paths"))
    
    return removed_vars


def main():
    """Main entry point for PlatformIO pre-script."""
    
    print()
    print("=" * 70)
    print(" clean_ros_env.py — Isolating micro_ros_platformio build")
    print("=" * 70)
    
    removed = clean_ros2_environment()
    
    if removed:
        print()
        print("Removed ROS2 environment variables:")
        for var, value in removed:
            print(f"  - {var}: {value}")
        print()
        print(f"Total: {len(removed)} variables cleaned")
    else:
        print()
        print("No ROS2 environment variables detected (clean environment)")
    
    # Verify critical variables are unset
    critical_unset = True
    for var in ["AMENT_PREFIX_PATH", "CMAKE_PREFIX_PATH", "ROS_DISTRO"]:
        if var in os.environ:
            print(f"WARNING: {var} still set after cleanup!")
            critical_unset = False
    
    if critical_unset:
        print()
        print("Environment ready for micro_ros_platformio build")
    
    print("=" * 70)
    print()


# Run when loaded by PlatformIO
main()
