#ifndef ROS_BRIDGE_H_
#define ROS_BRIDGE_H_

/**
 * ROS bridge module for micro-ROS communication.
 *
 * Owns all micro-ROS entities: publishers, subscribers, timers, executor.
 * Other modules are ROS-agnostic and provide data via getter functions.
 *
 * Publishers:
 *   /scan          - sensor_msgs/LaserScan (5 Hz)
 *   /odom          - nav_msgs/Odometry (50 Hz)
 *   /imu/data_raw  - sensor_msgs/Imu (50 Hz)
 *   /joint_states  - sensor_msgs/JointState (50 Hz)
 *
 * Subscribers:
 *   /cmd_vel       - geometry_msgs/Twist
 *   /servo_cmd     - sensor_msgs/JointState
 */

/**
 * Connection state machine for the micro-ROS agent relationship.
 *
 * Transitions:
 *   WAITING_AGENT   → AGENT_AVAILABLE  (ping succeeds on first init)
 *   AGENT_AVAILABLE → AGENT_CONNECTED  (ROS entities initialised)
 *   AGENT_CONNECTED → AGENT_DISCONNECTED (ping fails at runtime)
 *   AGENT_DISCONNECTED → AGENT_AVAILABLE (ping succeeds again)
 */
typedef enum {
    ROS_WAITING_AGENT,
    ROS_AGENT_AVAILABLE,
    ROS_AGENT_CONNECTED,
    ROS_AGENT_DISCONNECTED,
} ros_state_t;

/**
 * Initialize micro-ROS: WiFi transport, support, node, publishers,
 * subscribers, timers, and executor.
 * Blocks with LED blink on critical failure during first init.
 */
void ros_bridge_init();

/**
 * Spin the micro-ROS executor and manage agent connectivity.
 * Handles reconnection automatically when the agent restarts.
 * Should be called in loop().
 */
void ros_bridge_spin();

/** Return the current agent connection state. */
ros_state_t ros_bridge_get_state();

#endif  // ROS_BRIDGE_H_
