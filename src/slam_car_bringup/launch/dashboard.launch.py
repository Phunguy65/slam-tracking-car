"""
Web dashboard launch file.

Launches:
  - Robot bringup (micro-ROS agent + robot_state_publisher + cam_bridge)
  - rosbridge_websocket (WebSocket bridge on port 9090)
  - image_transport republisher (raw → compressed JPEG)
  - m-explore (frontier exploration, conditionally with slam_mode)

This launch file provides all ROS2 infrastructure needed for the web dashboard
to communicate with the robot via WebSocket.
"""
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    IncludeLaunchDescription,
    GroupAction,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    # ── Arguments ────────────────────────────────────────────
    rosbridge_port_arg = DeclareLaunchArgument(
        "rosbridge_port",
        default_value="9090",
        description="rosbridge WebSocket port",
    )
    slam_mode_arg = DeclareLaunchArgument(
        "slam_mode",
        default_value="false",
        description="Enable SLAM mode (launches slam_toolbox + m-explore)",
    )
    use_explore_arg = DeclareLaunchArgument(
        "use_explore",
        default_value="true",
        description="Enable m-explore for autonomous frontier exploration",
    )

    # ── Include robot bringup ────────────────────────────────
    robot_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([pkg_share, "launch", "robot.launch.py"])
        ),
    )

    # ── rosbridge WebSocket ──────────────────────────────────
    # Provides WebSocket interface at ws://0.0.0.0:9090 for web dashboard
    rosbridge = Node(
        package="rosbridge_server",
        executable="rosbridge_websocket",
        name="rosbridge_websocket",
        output="screen",
        parameters=[
            {
                "port": LaunchConfiguration("rosbridge_port"),
                "address": "0.0.0.0",
                "retry_startup_delay": 5.0,
                "fragment_timeout": 600,
                "delay_between_messages": 0,
                "max_message_size": 10000000,  # 10MB for images
                "unregister_timeout": 10.0,
            }
        ],
    )

    # ── image_transport republisher ──────────────────────────
    # Converts /camera/image_raw (BGR8) → /camera/image_raw/compressed (JPEG)
    # Reduces bandwidth from ~9MB/s to ~500KB/s for web streaming
    image_republisher = Node(
        package="image_transport",
        executable="republish",
        name="image_republisher",
        output="screen",
        arguments=[
            "raw",  # input transport
            "compressed",  # output transport
        ],
        remappings=[
            ("in", "/camera/image_raw"),
            ("out/compressed", "/camera/image_raw/compressed"),
        ],
        parameters=[
            {
                "compressed.jpeg_quality": 75,
                "compressed.png_level": 3,
            }
        ],
    )

    # ── SLAM mode nodes (conditional) ────────────────────────
    slam_nodes = GroupAction(
        condition=IfCondition(LaunchConfiguration("slam_mode")),
        actions=[
            # SLAM Toolbox
            Node(
                package="slam_toolbox",
                executable="async_slam_toolbox_node",
                name="slam_toolbox",
                output="screen",
                parameters=[
                    PathJoinSubstitution([pkg_share, "config", "slam_toolbox.yaml"]),
                    {"use_sim_time": False},
                ],
            ),
        ],
    )

    # ── m-explore (frontier exploration, conditional) ────────
    # Provides autonomous exploration via /explore/explore action
    explore_node = Node(
        package="explore_lite",
        executable="explore",
        name="explore",
        output="screen",
        parameters=[
            {
                "robot_base_frame": "base_footprint",
                "costmap_topic": "/map",
                "visualize": True,
                "planner_frequency": 0.33,
                "progress_timeout": 30.0,
                "potential_scale": 3.0,
                "orientation_scale": 0.0,
                "gain_scale": 1.0,
                "min_frontier_size": 0.5,
            }
        ],
        condition=IfCondition(LaunchConfiguration("use_explore")),
    )

    return LaunchDescription(
        [
            rosbridge_port_arg,
            slam_mode_arg,
            use_explore_arg,
            robot_launch,
            rosbridge,
            image_republisher,
            slam_nodes,
            explore_node,
        ]
    )
