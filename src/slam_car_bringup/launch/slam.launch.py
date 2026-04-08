"""
SLAM mapping launch file.

Launches:
  - Robot bringup (micro-ROS agent + robot_state_publisher + cam_bridge)
  - SLAM Toolbox in mapping mode
  - RViz2 for map visualization
"""
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    use_rviz_arg = DeclareLaunchArgument(
        "use_rviz", default_value="true", description="Launch RViz2"
    )

    # ── Include robot bringup ────────────────────────────────
    robot_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([pkg_share, "launch", "robot.launch.py"])
        ),
    )

    # ── SLAM Toolbox ─────────────────────────────────────────
    slam_toolbox = Node(
        package="slam_toolbox",
        executable="async_slam_toolbox_node",
        name="slam_toolbox",
        output="screen",
        parameters=[
            PathJoinSubstitution([pkg_share, "config", "slam_toolbox.yaml"]),
            {"use_sim_time": False},
        ],
    )

    # ── RViz2 ────────────────────────────────────────────────
    rviz = Node(
        package="rviz2",
        executable="rviz2",
        arguments=[
            "-d",
            PathJoinSubstitution([pkg_share, "rviz", "default.rviz"]),
        ],
        condition=IfCondition(LaunchConfiguration("use_rviz")),
        output="screen",
    )

    return LaunchDescription(
        [
            use_rviz_arg,
            robot_launch,
            slam_toolbox,
            rviz,
        ]
    )
