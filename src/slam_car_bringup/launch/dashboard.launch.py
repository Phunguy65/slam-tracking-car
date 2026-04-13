"""
Web dashboard launch file.

Launches:
  - Robot bringup (micro-ROS agent + robot_state_publisher + cam_bridge)
  - rosbridge_websocket (WebSocket bridge on port 9090)
  - image_transport republisher (raw → compressed JPEG)
  - map_manager_node (map listing, loading, mode switching)
  - SLAM Toolbox (mapping mode, always loaded)
  - Nav2 stack (navigation mode, lifecycle managed — starts inactive)
  - m-explore (frontier exploration, conditional)

Mode switching is handled dynamically via /map_manager/set_mode service.
Both SLAM and Nav2 stacks are loaded but only one is active at a time.
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
from launch_ros.actions import Node, LifecycleNode
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    # ── Arguments ────────────────────────────────────────────
    rosbridge_port_arg = DeclareLaunchArgument(
        "rosbridge_port",
        default_value="9090",
        description="rosbridge WebSocket port",
    )
    use_explore_arg = DeclareLaunchArgument(
        "use_explore",
        default_value="true",
        description="Enable m-explore for autonomous frontier exploration",
    )
    maps_directory_arg = DeclareLaunchArgument(
        "maps_directory",
        default_value=PathJoinSubstitution([pkg_share, "maps"]),
        description="Directory containing saved maps",
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

    # ── Map Manager Node ─────────────────────────────────────
    # Provides /map_manager/list_maps, /map_manager/load_map, /map_manager/set_mode
    map_manager = Node(
        package="slam_car_navigation",
        executable="map_manager_node",
        name="map_manager",
        output="screen",
        parameters=[
            {"maps_directory": LaunchConfiguration("maps_directory")},
        ],
    )

    # ── SLAM Toolbox (always running for mapping mode) ───────
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

    # ── Nav2 Lifecycle Nodes (start unconfigured) ────────────
    # These nodes start in UNCONFIGURED state and are activated
    # via /map_manager/set_mode service when switching to navigation mode
    nav2_params = PathJoinSubstitution([pkg_share, "config", "nav2_params.yaml"])

    map_server = LifecycleNode(
        package="nav2_map_server",
        executable="map_server",
        name="map_server",
        output="screen",
        parameters=[nav2_params, {"use_sim_time": False, "yaml_filename": ""}],
        namespace="",
    )

    amcl = LifecycleNode(
        package="nav2_amcl",
        executable="amcl",
        name="amcl",
        output="screen",
        parameters=[nav2_params, {"use_sim_time": False}],
        namespace="",
    )

    controller_server = LifecycleNode(
        package="nav2_controller",
        executable="controller_server",
        name="controller_server",
        output="screen",
        parameters=[nav2_params, {"use_sim_time": False}],
        namespace="",
    )

    planner_server = LifecycleNode(
        package="nav2_planner",
        executable="planner_server",
        name="planner_server",
        output="screen",
        parameters=[nav2_params, {"use_sim_time": False}],
        namespace="",
    )

    bt_navigator = LifecycleNode(
        package="nav2_bt_navigator",
        executable="bt_navigator",
        name="bt_navigator",
        output="screen",
        parameters=[nav2_params, {"use_sim_time": False}],
        namespace="",
    )

    # Note: We do NOT include lifecycle_manager here because
    # map_manager_node handles lifecycle transitions directly.
    # This gives us fine-grained control over when Nav2 activates.

    return LaunchDescription(
        [
            # Arguments
            rosbridge_port_arg,
            use_explore_arg,
            maps_directory_arg,
            # Core infrastructure
            robot_launch,
            rosbridge,
            image_republisher,
            map_manager,
            # SLAM (always active for mapping)
            slam_toolbox,
            explore_node,
            # Nav2 (lifecycle managed, starts unconfigured)
            map_server,
            amcl,
            controller_server,
            planner_server,
            bt_navigator,
        ]
    )
