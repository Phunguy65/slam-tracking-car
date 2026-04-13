/**
 * ROS bridge module for micro-ROS communication.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <micro_ros_platformio.h>
#include <rcl/rcl.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <rmw_microros/rmw_microros.h>
#include <sensor_msgs/msg/laser_scan.h>
#include <nav_msgs/msg/odometry.h>
#include <geometry_msgs/msg/twist.h>
#include <sensor_msgs/msg/imu.h>
#include <sensor_msgs/msg/joint_state.h>
#include <rosidl_runtime_c/string_functions.h>
#include <string.h>
#endif

#include "ros_bridge.h"
#include "config.h"
#include "motors.h"
#include "encoders.h"
#include "imu.h"
#include "lidar.h"
#include "servos.h"
#include "safety.h"

#include <math.h>

// ── micro-ROS entities ──────────────────────────────────────────────────────
#ifndef UNIT_TEST
static rcl_allocator_t allocator;
static rclc_support_t support;
static rcl_node_t node;
static rclc_executor_t executor;

// Publishers
static rcl_publisher_t scan_publisher;
static rcl_publisher_t odom_publisher;
static rcl_publisher_t imu_publisher;
static rcl_publisher_t joint_states_publisher;

// Messages
static sensor_msgs__msg__LaserScan scan_msg;
static nav_msgs__msg__Odometry odom_msg;
static sensor_msgs__msg__Imu imu_msg;
static sensor_msgs__msg__JointState joint_states_msg;

// Subscribers
static rcl_subscription_t cmd_vel_subscriber;
static rcl_subscription_t servo_cmd_subscriber;
static geometry_msgs__msg__Twist cmd_vel_msg;
static sensor_msgs__msg__JointState servo_cmd_msg;

// Timers
static rcl_timer_t fast_timer;   // 50 Hz — odom, IMU, joint_states
static rcl_timer_t scan_timer;   // 5 Hz  — LaserScan

// ── JointState string storage ───────────────────────────────────────────────
static rosidl_runtime_c__String joint_names_data[2];
static double joint_positions_data[2];
static double joint_velocities_data[2];
static double joint_efforts_data[2];

static rosidl_runtime_c__String servo_cmd_names_data[2];
static double servo_cmd_positions_data[2];

// ── LaserScan data storage ──────────────────────────────────────────────────
static float scan_ranges_data[SCAN_POINTS];
static float scan_intensities_data[SCAN_POINTS];
#endif

// ── Forward declarations ────────────────────────────────────────────────────
#ifndef UNIT_TEST
static void setup_messages();
static void setup_micro_ros();
static void cmd_vel_callback(const void *msg_in);
static void servo_cmd_callback(const void *msg_in);
static void fast_timer_callback(rcl_timer_t *timer, int64_t last_call_time);
static void scan_timer_callback(rcl_timer_t *timer, int64_t last_call_time);

// ── Time sync helper ────────────────────────────────────────────────────────
static inline void fill_timestamp(builtin_interfaces__msg__Time *stamp) {
    int64_t now_ns = rmw_uros_epoch_nanos();
    stamp->sec = (int32_t)(now_ns / 1000000000LL);
    stamp->nanosec = (uint32_t)(now_ns % 1000000000LL);
}
#endif

// ── Public API ──────────────────────────────────────────────────────────────

void ros_bridge_init() {
#ifndef UNIT_TEST
    // WiFi transport for micro-ROS
    IPAddress agent_ip;
    agent_ip.fromString(AGENT_IP);
    set_microros_wifi_transports(
        (char*)WIFI_SSID, (char*)WIFI_PASSWORD,
        agent_ip, AGENT_PORT
    );
    delay(2000);

    setup_messages();
    setup_micro_ros();

    Serial.println("[SLAM Car] micro-ROS node started");
#endif
}

void ros_bridge_spin() {
#ifndef UNIT_TEST
    rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10));
#endif
}

// ── Message pre-allocation ──────────────────────────────────────────────────
#ifndef UNIT_TEST
static void setup_messages() {
    // ── LaserScan ──
    scan_msg.ranges.data = scan_ranges_data;
    scan_msg.ranges.size = SCAN_POINTS;
    scan_msg.ranges.capacity = SCAN_POINTS;
    scan_msg.intensities.data = scan_intensities_data;
    scan_msg.intensities.size = SCAN_POINTS;
    scan_msg.intensities.capacity = SCAN_POINTS;
    rosidl_runtime_c__String__assign(&scan_msg.header.frame_id, "laser_link");
    scan_msg.angle_min = 0.0f;
    scan_msg.angle_max = 2.0f * PI;
    scan_msg.angle_increment = (2.0f * PI) / (float)SCAN_POINTS;
    scan_msg.scan_time = 0.2f;  // 5 Hz scan rate = 200ms per full scan
    scan_msg.time_increment = scan_msg.scan_time / (float)SCAN_POINTS;
    scan_msg.range_min = 0.13f;
    scan_msg.range_max = 8.0f;

    // ── Odometry ──
    rosidl_runtime_c__String__assign(&odom_msg.header.frame_id, "odom");
    rosidl_runtime_c__String__assign(&odom_msg.child_frame_id, "base_footprint");
    // Pose covariance (6x6 diagonal: x, y, z, roll, pitch, yaw)
    odom_msg.pose.covariance[0]  = 0.001;  // x variance
    odom_msg.pose.covariance[7]  = 0.001;  // y variance
    odom_msg.pose.covariance[35] = 0.01;   // yaw variance (higher — single-phase encoder)
    // Twist covariance
    odom_msg.twist.covariance[0]  = 0.001;  // vx variance
    odom_msg.twist.covariance[35] = 0.01;   // vyaw variance

    // ── IMU ──
    rosidl_runtime_c__String__assign(&imu_msg.header.frame_id, "imu_link");
    // Orientation not provided — set covariance[0] = -1
    imu_msg.orientation_covariance[0] = -1.0;
    // Set orientation to identity quaternion
    imu_msg.orientation.w = 1.0;
    imu_msg.orientation.x = 0.0;
    imu_msg.orientation.y = 0.0;
    imu_msg.orientation.z = 0.0;
    // Angular velocity covariance (MPU6050 gyro noise ~0.003 rad/s)
    imu_msg.angular_velocity_covariance[0] = 0.000009;  // x
    imu_msg.angular_velocity_covariance[4] = 0.000009;  // y
    imu_msg.angular_velocity_covariance[8] = 0.000009;  // z
    // Linear acceleration covariance (MPU6050 accel noise ~300 ug/sqrt(Hz))
    imu_msg.linear_acceleration_covariance[0] = 0.0001;  // x
    imu_msg.linear_acceleration_covariance[4] = 0.0001;  // y
    imu_msg.linear_acceleration_covariance[8] = 0.0001;  // z

    // ── JointState (publisher) ──
    rosidl_runtime_c__String__assign(&joint_names_data[0], "camera_pan_joint");
    rosidl_runtime_c__String__assign(&joint_names_data[1], "camera_tilt_joint");
    joint_states_msg.name.data = joint_names_data;
    joint_states_msg.name.size = 2;
    joint_states_msg.name.capacity = 2;
    joint_states_msg.position.data = joint_positions_data;
    joint_states_msg.position.size = 2;
    joint_states_msg.position.capacity = 2;
    joint_states_msg.velocity.data = joint_velocities_data;
    joint_states_msg.velocity.size = 0;
    joint_states_msg.velocity.capacity = 2;
    joint_states_msg.effort.data = joint_efforts_data;
    joint_states_msg.effort.size = 0;
    joint_states_msg.effort.capacity = 2;

    // ── JointState (subscriber) — pre-allocate for incoming messages ──
    servo_cmd_msg.name.data = servo_cmd_names_data;
    servo_cmd_msg.name.size = 0;
    servo_cmd_msg.name.capacity = 2;
    servo_cmd_msg.position.data = servo_cmd_positions_data;
    servo_cmd_msg.position.size = 0;
    servo_cmd_msg.position.capacity = 2;
}

// ── micro-ROS setup ─────────────────────────────────────────────────────────
static void setup_micro_ros() {
    allocator = rcl_get_default_allocator();

    // Critical initialization — must succeed for firmware to operate
    rcl_ret_t ret = rclc_support_init(&support, 0, NULL, &allocator);
    if (ret != RCL_RET_OK) {
        Serial.printf("[micro-ROS] FATAL: rclc_support_init failed (err=%d). Check agent connectivity.\n", (int)ret);
        while (true) {
            digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));  // Blink LED to indicate error
            delay(200);
        }
    }

    ret = rclc_node_init_default(&node, "slam_car_esp32", "", &support);
    if (ret != RCL_RET_OK) {
        Serial.printf("[micro-ROS] FATAL: rclc_node_init failed (err=%d)\n", (int)ret);
        while (true) {
            digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
            delay(200);
        }
    }

    // Sync time with micro-ROS agent (required for valid header.stamp)
    if (!rmw_uros_sync_session(1000)) {
        Serial.println("[micro-ROS] WARNING: time sync failed — timestamps may be incorrect");
    } else {
        Serial.println("[micro-ROS] Time synced with agent");
    }

    // Publishers (4) — log warnings on failure but continue
    ret = rclc_publisher_init_default(
        &scan_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, LaserScan),
        "scan"
    );
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: scan publisher init failed (err=%d)\n", (int)ret);

    ret = rclc_publisher_init_default(
        &odom_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(nav_msgs, msg, Odometry),
        "odom"
    );
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: odom publisher init failed (err=%d)\n", (int)ret);

    ret = rclc_publisher_init_default(
        &imu_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, Imu),
        "imu/data_raw"
    );
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: imu publisher init failed (err=%d)\n", (int)ret);

    ret = rclc_publisher_init_default(
        &joint_states_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, JointState),
        "joint_states"
    );
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: joint_states publisher init failed (err=%d)\n", (int)ret);

    // Subscribers (2)
    ret = rclc_subscription_init_default(
        &cmd_vel_subscriber, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(geometry_msgs, msg, Twist),
        "cmd_vel"
    );
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: cmd_vel subscriber init failed (err=%d)\n", (int)ret);

    ret = rclc_subscription_init_default(
        &servo_cmd_subscriber, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, JointState),
        "servo_cmd"
    );
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: servo_cmd subscriber init failed (err=%d)\n", (int)ret);

    // Timers
    ret = rclc_timer_init_default(&fast_timer, &support, RCL_MS_TO_NS(20), fast_timer_callback);   // 50 Hz
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: fast_timer init failed (err=%d)\n", (int)ret);

    ret = rclc_timer_init_default(&scan_timer, &support, RCL_MS_TO_NS(200), scan_timer_callback);   // 5 Hz
    if (ret != RCL_RET_OK) Serial.printf("[micro-ROS] WARNING: scan_timer init failed (err=%d)\n", (int)ret);

    // Executor: 2 subscribers + 2 timers = 4 handles
    ret = rclc_executor_init(&executor, &support.context, 4, &allocator);
    if (ret != RCL_RET_OK) {
        Serial.printf("[micro-ROS] FATAL: executor init failed (err=%d)\n", (int)ret);
        while (true) {
            digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
            delay(200);
        }
    }

    rclc_executor_add_subscription(
        &executor, &cmd_vel_subscriber, &cmd_vel_msg,
        &cmd_vel_callback, ON_NEW_DATA
    );
    rclc_executor_add_subscription(
        &executor, &servo_cmd_subscriber, &servo_cmd_msg,
        &servo_cmd_callback, ON_NEW_DATA
    );
    rclc_executor_add_timer(&executor, &fast_timer);
    rclc_executor_add_timer(&executor, &scan_timer);
}

// ── cmd_vel callback ────────────────────────────────────────────────────────
static void cmd_vel_callback(const void *msg_in) {
    const geometry_msgs__msg__Twist *msg = (const geometry_msgs__msg__Twist *)msg_in;
    safety_notify_cmd_vel();

    // Only apply if motion is allowed (LiDAR active)
    if (safety_is_motion_allowed()) {
        motors_apply_cmd_vel(msg->linear.x, msg->angular.z);
    }
}

// ── servo_cmd callback ──────────────────────────────────────────────────────
static void servo_cmd_callback(const void *msg_in) {
    const sensor_msgs__msg__JointState *msg = (const sensor_msgs__msg__JointState *)msg_in;

    for (size_t i = 0; i < msg->name.size && i < msg->position.size; i++) {
        const char *name = msg->name.data[i].data;
        float rad = (float)msg->position.data[i];

        if (strcmp(name, "camera_pan_joint") == 0) {
            servos_set_pan(rad);
        } else if (strcmp(name, "camera_tilt_joint") == 0) {
            servos_set_tilt(rad);
        }
    }
}

// ── Fast timer callback (50 Hz) — odom, IMU, joint_states ──────────────────
static void fast_timer_callback(rcl_timer_t *timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    // Safety checks
    safety_check();

    // Get current timestamp for all messages in this callback
    fill_timestamp(&odom_msg.header.stamp);

    // Update and publish odometry
    encoders_update_odometry();

    odom_msg.pose.pose.position.x = encoders_get_x();
    odom_msg.pose.pose.position.y = encoders_get_y();
    odom_msg.pose.pose.position.z = 0.0;

    // Quaternion from yaw
    float theta = encoders_get_theta();
    odom_msg.pose.pose.orientation.w = cosf(theta / 2.0f);
    odom_msg.pose.pose.orientation.x = 0.0;
    odom_msg.pose.pose.orientation.y = 0.0;
    odom_msg.pose.pose.orientation.z = sinf(theta / 2.0f);

    odom_msg.twist.twist.linear.x = encoders_get_linear_vel();
    odom_msg.twist.twist.linear.y = 0.0;
    odom_msg.twist.twist.linear.z = 0.0;
    odom_msg.twist.twist.angular.x = 0.0;
    odom_msg.twist.twist.angular.y = 0.0;
    odom_msg.twist.twist.angular.z = encoders_get_angular_vel();

    rcl_publish(&odom_publisher, &odom_msg, NULL);

    // Read and publish IMU (if enabled)
    imu_read();
    if (imu_is_enabled()) {
        imu_msg.header.stamp = odom_msg.header.stamp;
        imu_msg.linear_acceleration.x = imu_get_accel_x();
        imu_msg.linear_acceleration.y = imu_get_accel_y();
        imu_msg.linear_acceleration.z = imu_get_accel_z();
        imu_msg.angular_velocity.x = imu_get_gyro_x();
        imu_msg.angular_velocity.y = imu_get_gyro_y();
        imu_msg.angular_velocity.z = imu_get_gyro_z();
        rcl_publish(&imu_publisher, &imu_msg, NULL);
    }

    // Publish servo joint states
    joint_states_msg.header.stamp = odom_msg.header.stamp;
    joint_positions_data[0] = (double)servos_get_pan();
    joint_positions_data[1] = (double)servos_get_tilt();
    rcl_publish(&joint_states_publisher, &joint_states_msg, NULL);
}

// ── Scan timer callback (5 Hz) — LaserScan ─────────────────────────────────
static void scan_timer_callback(rcl_timer_t *timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    if (!lidar_is_active()) return;

    if (lidar_is_scan_ready()) {
        fill_timestamp(&scan_msg.header.stamp);
        // Copy accumulated scan data to message
        memcpy(scan_ranges_data, lidar_get_ranges(), sizeof(float) * SCAN_POINTS);
        rcl_publish(&scan_publisher, &scan_msg, NULL);
        lidar_clear_scan_ready();
    }
}
#endif
