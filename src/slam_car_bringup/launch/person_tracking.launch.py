"""
Person tracking mode launch file.

Launches:
  - Robot bringup (micro-ROS agent + robot_state_publisher + cam_bridge)
  - Enrollment node (face enrollment + database management)
  - Person tracker node (body/face detection + recognition)
  - Tracking controller node (servo + wheel coordination)
  - rosbridge for web UI communication
"""

from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")
    config_file = PathJoinSubstitution([pkg_share, "config", "person_tracker.yaml"])

    # ── Include robot bringup ────────────────────────────────
    # This launches: micro-ROS agent, robot_state_publisher, cam_bridge_node
    robot_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([pkg_share, "launch", "robot.launch.py"])
        ),
    )

    # ── Enrollment node ──────────────────────────────────────
    # Handles face enrollment, database management, and tracking target
    enrollment_node = Node(
        package="slam_car_perception",
        executable="enrollment_node",
        name="enrollment_node",
        output="screen",
        parameters=[config_file],
    )

    # ── Person tracker node ──────────────────────────────────
    # Detects bodies and faces, matches against enrolled embeddings
    person_tracker_node = Node(
        package="slam_car_perception",
        executable="person_tracker_node",
        name="person_tracker_node",
        output="screen",
        parameters=[config_file],
    )

    # ── Tracking controller node ─────────────────────────────
    # Controls servo pan and wheel movement to follow target
    tracking_controller_node = Node(
        package="slam_car_perception",
        executable="tracking_controller_node",
        name="tracking_controller_node",
        output="screen",
        parameters=[config_file],
    )

    # ── rosbridge for web UI ─────────────────────────────────
    # WebSocket bridge for enrollment UI and tracking visualization
    rosbridge = Node(
        package="rosbridge_server",
        executable="rosbridge_websocket",
        name="rosbridge_websocket",
        output="screen",
        parameters=[
            {"port": 9090},
            {"address": "0.0.0.0"},
        ],
    )

    return LaunchDescription(
        [
            robot_launch,
            enrollment_node,
            person_tracker_node,
            tracking_controller_node,
            rosbridge,
        ]
    )
