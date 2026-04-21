"""
Real robot bringup launch file for SLAM Tracking Car.

Launches:
  - micro-ROS Agent (WiFi UDP transport)
  - Robot state publisher (URDF → TF)
  - Camera bridge (ESP32-CAM HTTP → /camera/image_raw)
  - robot_localization EKF (odom + IMU fusion → /odometry/filtered)

Network defaults (CAM_IP, CAM_STREAM_PORT, AGENT_PORT) are loaded from
``firmware/.env`` so that firmware and host share a single source of truth.
Precedence: CLI launch arg > environment variable > firmware/.env > fallback.
"""

import os
from pathlib import Path

import xacro
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare

_FALLBACK_CAM_IP = "192.168.100.248"
_FALLBACK_CAM_PORT = "80"
_FALLBACK_AGENT_PORT = "8888"


def _parse_env_file(path: Path) -> dict[str, str]:
    """Minimal .env parser: KEY=VALUE lines, skips comments and blanks."""
    result: dict[str, str] = {}
    if not path.is_file():
        return result
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip("\"'")
        result[key.strip()] = value
    return result


def _env(key: str, env_file_vars: dict[str, str], fallback: str) -> str:
    """Resolve a config value: env var > .env file > hard-coded fallback."""
    return os.environ.get(key, env_file_vars.get(key, fallback))


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    # ── Load firmware/.env defaults ─────────────────────────
    repo_root = Path(__file__).resolve().parents[4]
    env_vars = _parse_env_file(repo_root / "firmware" / ".env")

    cam_ip = _env("CAM_IP", env_vars, _FALLBACK_CAM_IP)
    cam_port = _env("CAM_STREAM_PORT", env_vars, _FALLBACK_CAM_PORT)
    agent_port = _env("AGENT_PORT", env_vars, _FALLBACK_AGENT_PORT)
    default_cam_url = f"http://{cam_ip}:{cam_port}/stream"

    # ── Arguments ────────────────────────────────────────────
    agent_port_arg = DeclareLaunchArgument(
        "agent_port",
        default_value=agent_port,
        description="micro-ROS agent UDP port",
    )
    cam_url_arg = DeclareLaunchArgument(
        "cam_url",
        default_value=default_cam_url,
        description="ESP32-CAM MJPEG stream URL (default from firmware/.env)",
    )

    # ── Robot description ────────────────────────────────────
    xacro_file = os.path.join(
        FindPackageShare("slam_car_bringup").find("slam_car_bringup"),
        "urdf",
        "robot.urdf.xacro",
    )
    robot_description = xacro.process_file(xacro_file).toxml()

    robot_state_publisher = Node(
        package="robot_state_publisher",
        executable="robot_state_publisher",
        output="screen",
        parameters=[{"robot_description": robot_description, "use_sim_time": False}],
    )

    # ── micro-ROS Agent ──────────────────────────────────────
    micro_ros_agent = ExecuteProcess(
        cmd=[
            "ros2",
            "run",
            "micro_ros_agent",
            "micro_ros_agent",
            "udp4",
            "--port",
            LaunchConfiguration("agent_port"),
        ],
        output="screen",
    )

    # ── Camera bridge ────────────────────────────────────────
    cam_bridge = Node(
        package="slam_car_perception",
        executable="cam_bridge_node",
        output="screen",
        parameters=[{"cam_url": LaunchConfiguration("cam_url")}],
    )

    # ── robot_localization EKF (odom + IMU fusion) ───────────
    ekf_node = Node(
        package="robot_localization",
        executable="ekf_node",
        name="ekf_filter_node",
        output="screen",
        parameters=[
            PathJoinSubstitution([pkg_share, "config", "ekf.yaml"]),
            {"use_sim_time": False},
        ],
    )

    return LaunchDescription(
        [
            agent_port_arg,
            cam_url_arg,
            robot_state_publisher,
            micro_ros_agent,
            cam_bridge,
            ekf_node,
        ]
    )
