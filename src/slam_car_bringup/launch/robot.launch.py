"""
Real robot bringup launch file for SLAM Tracking Car.

Launches:
  - micro-ROS Agent (WiFi UDP transport)
  - Robot state publisher (URDF → TF)
  - Camera bridge (ESP32-CAM HTTP → /camera/image_raw)
  - robot_localization EKF (odom + IMU fusion → /odometry/filtered)
"""
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
import os
import xacro


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    # ── Arguments ────────────────────────────────────────────
    agent_port_arg = DeclareLaunchArgument(
        "agent_port", default_value="8888",
        description="micro-ROS agent UDP port",
    )
    cam_url_arg = DeclareLaunchArgument(
        "cam_url", default_value="http://192.168.1.100:80/stream",
        description="ESP32-CAM MJPEG stream URL",
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
        parameters=[
            {"robot_description": robot_description, "use_sim_time": False}
        ],
    )

    # ── micro-ROS Agent ──────────────────────────────────────
    micro_ros_agent = ExecuteProcess(
        cmd=[
            "ros2", "run", "micro_ros_agent", "micro_ros_agent",
            "udp4", "--port", LaunchConfiguration("agent_port"),
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
