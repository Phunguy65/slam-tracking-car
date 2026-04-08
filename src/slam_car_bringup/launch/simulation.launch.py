"""
Gazebo Fortress simulation launch file for SLAM Tracking Car.

Launches:
  - Gazebo Fortress with house world
  - Robot state publisher (URDF → TF)
  - ros_gz_bridge (Gazebo ↔ ROS2 topics)
  - RViz2 (optional)
"""
import os
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    IncludeLaunchDescription,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
import xacro


def generate_launch_description():
    pkg_share = FindPackageShare("slam_car_bringup")

    # ── Arguments ────────────────────────────────────────────
    use_rviz_arg = DeclareLaunchArgument(
        "use_rviz", default_value="true", description="Launch RViz2"
    )
    world_arg = DeclareLaunchArgument(
        "world",
        default_value=PathJoinSubstitution([pkg_share, "worlds", "house.sdf"]),
        description="Gazebo world file",
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
            {"robot_description": robot_description, "use_sim_time": True}
        ],
    )

    # ── Gazebo Fortress ──────────────────────────────────────
    gazebo = ExecuteProcess(
        cmd=[
            "gz", "sim", "-v4", "-r",
            LaunchConfiguration("world"),
        ],
        output="screen",
    )

    # Spawn robot in Gazebo
    spawn_entity = Node(
        package="ros_gz_sim",
        executable="create",
        arguments=[
            "-name", "slam_tracking_car",
            "-topic", "robot_description",
            "-x", "0.0",
            "-y", "0.0",
            "-z", "0.1",
        ],
        output="screen",
    )

    # ── ros_gz_bridge ────────────────────────────────────────
    bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        arguments=[
            "/scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan",
            "/camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
            "/cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist",
            "/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            "/joint_states@sensor_msgs/msg/JointState[gz.msgs.Model",
            "/tf@tf2_msgs/msg/TFMessage[gz.msgs.Pose_V",
            "/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock",
        ],
        output="screen",
    )

    # ── RViz2 ────────────────────────────────────────────────
    rviz = Node(
        package="rviz2",
        executable="rviz2",
        arguments=[
            "-d",
            PathJoinSubstitution([pkg_share, "rviz", "default.rviz"]),
        ],
        parameters=[{"use_sim_time": True}],
        condition=IfCondition(LaunchConfiguration("use_rviz")),
        output="screen",
    )

    return LaunchDescription(
        [
            use_rviz_arg,
            world_arg,
            robot_state_publisher,
            gazebo,
            spawn_entity,
            bridge,
            rviz,
        ]
    )
