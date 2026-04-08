"""
Face tracking mode launch file.

Launches:
  - Robot bringup (micro-ROS agent + robot_state_publisher + cam_bridge)
  - Face detector node (perception: /camera/image_raw → /face_detections)
  - Face follow controller (control: /face_detections → /cmd_vel)
"""
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    # ── Include robot bringup ────────────────────────────────
    robot_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([pkg_share, "launch", "robot.launch.py"])
        ),
    )

    # ── Face detector (perception layer) ─────────────────────
    face_detector = Node(
        package="slam_car_perception",
        executable="face_tracker_node",
        output="screen",
        parameters=[
            PathJoinSubstitution([pkg_share, "config", "face_tracker.yaml"]),
        ],
    )

    # ── Face follow controller (control layer) ───────────────
    face_controller = Node(
        package="slam_car_perception",
        executable="face_follow_controller",
        output="screen",
        parameters=[
            PathJoinSubstitution([pkg_share, "config", "face_tracker.yaml"]),
        ],
    )

    return LaunchDescription(
        [
            robot_launch,
            face_detector,
            face_controller,
        ]
    )
