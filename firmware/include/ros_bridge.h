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
 * Initialize micro-ROS: WiFi transport, support, node, publishers,
 * subscribers, timers, and executor.
 * Blocks with LED blink on critical failure.
 */
void ros_bridge_init();

/**
 * Spin the micro-ROS executor to process callbacks.
 * Should be called in loop().
 */
void ros_bridge_spin();

#endif // ROS_BRIDGE_H_
