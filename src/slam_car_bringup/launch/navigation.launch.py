"""
Navigation launch file (uses a previously saved map).

Launches:
  - Robot bringup (micro-ROS agent + robot_state_publisher + cam_bridge)
  - Nav2 stack (AMCL, planner, controller, BT navigator)
  - Map server with saved map
  - RViz2
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

    map_arg = DeclareLaunchArgument(
        "map",
        default_value=PathJoinSubstitution([pkg_share, "maps", "map.yaml"]),
        description="Path to map YAML file",
    )
    use_rviz_arg = DeclareLaunchArgument(
        "use_rviz", default_value="true", description="Launch RViz2"
    )

    # ── Include robot bringup ────────────────────────────────
    robot_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([pkg_share, "launch", "robot.launch.py"])
        ),
    )

    # ── Nav2 bringup ─────────────────────────────────────────
    nav2_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [FindPackageShare("nav2_bringup"), "launch", "bringup_launch.py"]
            )
        ),
        launch_arguments={
            "map": LaunchConfiguration("map"),
            "params_file": PathJoinSubstitution(
                [pkg_share, "config", "nav2_params.yaml"]
            ),
            "use_sim_time": "false",
        }.items(),
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
            map_arg,
            use_rviz_arg,
            robot_launch,
            nav2_launch,
            rviz,
        ]
    )
