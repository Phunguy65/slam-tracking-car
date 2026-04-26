/**
 * ROS bridge module for micro-ROS communication.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <geometry_msgs/msg/twist.h>
#include <micro_ros_platformio.h>
#include <nav_msgs/msg/odometry.h>
#include <rcl/rcl.h>
#include <rcl_interfaces/msg/log.h>
#include <rclc/executor.h>
#include <rclc/rclc.h>
#include <rmw_microros/rmw_microros.h>
#include <rosidl_runtime_c/string_functions.h>
#include <sensor_msgs/msg/imu.h>
#include <sensor_msgs/msg/joint_state.h>
#include <sensor_msgs/msg/laser_scan.h>
#include <string.h>
#endif

#include <math.h>

#include "config.h"
#include "encoders.h"
#include "imu.h"
#include "lidar.h"
#include "logger.h"
#include "motors.h"
#include "ros_bridge.h"
#include "safety.h"
#include "servos.h"

// ── micro-ROS entities ──────────────────────────────────────────────────────
#ifndef UNIT_TEST
static rcl_allocator_t allocator;
static rclc_support_t support;
static rcl_node_t node;
static rclc_executor_t executor;

static rcl_publisher_t scan_publisher;
static rcl_publisher_t odom_publisher;
static rcl_publisher_t imu_publisher;
static rcl_publisher_t joint_states_publisher;
static rcl_publisher_t log_publisher;

static sensor_msgs__msg__LaserScan scan_msg;
static nav_msgs__msg__Odometry odom_msg;
static sensor_msgs__msg__Imu imu_msg;
static sensor_msgs__msg__JointState joint_states_msg;

static rcl_subscription_t cmd_vel_subscriber;
static rcl_subscription_t servo_cmd_subscriber;
static geometry_msgs__msg__Twist cmd_vel_msg;
static sensor_msgs__msg__JointState servo_cmd_msg;

static rcl_timer_t fast_timer_50hz;
static rcl_timer_t scan_timer_5hz;

// ── JointState string storage (pan joint only; tilt removed by design) ──────
static rosidl_runtime_c__String joint_names_data[1];
static double joint_positions_data[1];
static double joint_velocities_data[1];
static double joint_efforts_data[1];

static rosidl_runtime_c__String servo_cmd_names_data[1];
static double servo_cmd_positions_data[1];

// ── LaserScan data storage ──────────────────────────────────────────────────
static float scan_ranges_data[SCAN_POINTS];
static float scan_intensities_data[SCAN_POINTS];
#endif

// ── Forward declarations ────────────────────────────────────────────────────
#ifndef UNIT_TEST
static void setup_messages();
static void setup_micro_ros();
static void cmd_vel_callback(const void* msg_in);
static void servo_cmd_callback(const void* msg_in);
static void fast_timer_callback(rcl_timer_t* timer, int64_t last_call_time);
static void scan_timer_callback(rcl_timer_t* timer, int64_t last_call_time);

// ── Time sync helper ────────────────────────────────────────────────────────
static inline void fill_timestamp(builtin_interfaces__msg__Time* stamp) {
    int64_t now_ns = rmw_uros_epoch_nanos();
    stamp->sec = (int32_t)(now_ns / 1000000000LL);
    stamp->nanosec = (uint32_t)(now_ns % 1000000000LL);
}
#endif

// ── Public API ──────────────────────────────────────────────────────────────

void ros_bridge_init() {
#ifndef UNIT_TEST
    IPAddress agent_ip;
    agent_ip.fromString(AGENT_IP);
    set_microros_wifi_transports((char*)WIFI_SSID, (char*)WIFI_PASSWORD, agent_ip, AGENT_PORT);
    delay(2000);

    setup_messages();
    setup_micro_ros();

    ros_log("SLAM Car", "micro-ROS node started");
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
    scan_msg.scan_time = 0.2f;
    scan_msg.time_increment = scan_msg.scan_time / (float)SCAN_POINTS;
    scan_msg.range_min = 0.13f;
    scan_msg.range_max = 8.0f;

    // ── Odometry ──
    rosidl_runtime_c__String__assign(&odom_msg.header.frame_id, "odom");
    rosidl_runtime_c__String__assign(&odom_msg.child_frame_id, "base_footprint");
    odom_msg.pose.covariance[0] = 0.001;
    odom_msg.pose.covariance[7] = 0.001;
    odom_msg.pose.covariance[35] = 0.01;
    odom_msg.twist.covariance[0] = 0.001;
    odom_msg.twist.covariance[35] = 0.01;

    // ── IMU ──
    rosidl_runtime_c__String__assign(&imu_msg.header.frame_id, "imu_link");
    imu_msg.orientation_covariance[0] = -1.0;
    imu_msg.orientation.w = 1.0;
    imu_msg.orientation.x = 0.0;
    imu_msg.orientation.y = 0.0;
    imu_msg.orientation.z = 0.0;
    imu_msg.angular_velocity_covariance[0] = 0.000009;
    imu_msg.angular_velocity_covariance[4] = 0.000009;
    imu_msg.angular_velocity_covariance[8] = 0.000009;
    imu_msg.linear_acceleration_covariance[0] = 0.0001;
    imu_msg.linear_acceleration_covariance[4] = 0.0001;
    imu_msg.linear_acceleration_covariance[8] = 0.0001;

    // ── JointState publisher (pan servo only) ──
    rosidl_runtime_c__String__assign(&joint_names_data[0], "camera_pan_joint");
    joint_states_msg.name.data = joint_names_data;
    joint_states_msg.name.size = 1;
    joint_states_msg.name.capacity = 1;
    joint_states_msg.position.data = joint_positions_data;
    joint_states_msg.position.size = 1;
    joint_states_msg.position.capacity = 1;
    joint_states_msg.velocity.data = joint_velocities_data;
    joint_states_msg.velocity.size = 0;
    joint_states_msg.velocity.capacity = 1;
    joint_states_msg.effort.data = joint_efforts_data;
    joint_states_msg.effort.size = 0;
    joint_states_msg.effort.capacity = 1;

    // ── JointState subscriber (pre-allocated for incoming messages) ──
    servo_cmd_msg.name.data = servo_cmd_names_data;
    servo_cmd_msg.name.size = 0;
    servo_cmd_msg.name.capacity = 1;
    servo_cmd_msg.position.data = servo_cmd_positions_data;
    servo_cmd_msg.position.size = 0;
    servo_cmd_msg.position.capacity = 1;
}

// ── micro-ROS setup ─────────────────────────────────────────────────────────
static void setup_micro_ros() {
    allocator = rcl_get_default_allocator();

    rcl_ret_t ret = rclc_support_init(&support, 0, NULL, &allocator);
    if (ret != RCL_RET_OK) {
        ros_logf("micro-ROS", "FATAL: rclc_support_init failed (err=%d). Check agent connectivity.",
                 (int)ret);
        while (true) {
            digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
            delay(200);
        }
    }

    ret = rclc_node_init_default(&node, "slam_car_esp32", "", &support);
    if (ret != RCL_RET_OK) {
        ros_logf("micro-ROS", "FATAL: rclc_node_init failed (err=%d)", (int)ret);
        while (true) {
            digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
            delay(200);
        }
    }

    if (!rmw_uros_sync_session(1000)) {
        ros_log("micro-ROS", "WARNING: time sync failed — timestamps may be incorrect");
    } else {
        ros_log("micro-ROS", "Time synced with agent");
    }

    // ── Publishers ──
    ret = rclc_publisher_init_default(
        &scan_publisher, &node, ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, LaserScan), "scan");
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: scan publisher init failed (err=%d)", (int)ret);

    ret = rclc_publisher_init_default(&odom_publisher, &node,
                                      ROSIDL_GET_MSG_TYPE_SUPPORT(nav_msgs, msg, Odometry), "odom");
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: odom publisher init failed (err=%d)", (int)ret);

    ret = rclc_publisher_init_default(
        &imu_publisher, &node, ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, Imu), "imu/data_raw");
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: imu publisher init failed (err=%d)", (int)ret);

    ret = rclc_publisher_init_default(&joint_states_publisher, &node,
                                      ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, JointState),
                                      "joint_states");
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: joint_states publisher init failed (err=%d)", (int)ret);

    ret = rclc_publisher_init_best_effort(
        &log_publisher, &node, ROSIDL_GET_MSG_TYPE_SUPPORT(rcl_interfaces, msg, Log), "rosout");
    if (ret != RCL_RET_OK) {
        ros_logf("micro-ROS", "WARNING: log publisher init failed (err=%d)", (int)ret);
    } else {
        logger_set_publisher(&log_publisher);
    }

    // ── Subscribers ──
    ret = rclc_subscription_init_default(&cmd_vel_subscriber, &node,
                                         ROSIDL_GET_MSG_TYPE_SUPPORT(geometry_msgs, msg, Twist),
                                         "cmd_vel");
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: cmd_vel subscriber init failed (err=%d)", (int)ret);

    ret = rclc_subscription_init_default(&servo_cmd_subscriber, &node,
                                         ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, JointState),
                                         "servo_cmd");
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: servo_cmd subscriber init failed (err=%d)", (int)ret);

    // ── Timers ──
    ret =
        rclc_timer_init_default(&fast_timer_50hz, &support, RCL_MS_TO_NS(20), fast_timer_callback);
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: fast_timer init failed (err=%d)", (int)ret);

    ret =
        rclc_timer_init_default(&scan_timer_5hz, &support, RCL_MS_TO_NS(200), scan_timer_callback);
    if (ret != RCL_RET_OK)
        ros_logf("micro-ROS", "WARNING: scan_timer init failed (err=%d)", (int)ret);

    // ── Executor ──
    const size_t executor_handle_count = 4;
    ret = rclc_executor_init(&executor, &support.context, executor_handle_count, &allocator);
    if (ret != RCL_RET_OK) {
        ros_logf("micro-ROS", "FATAL: executor init failed (err=%d)", (int)ret);
        while (true) {
            digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
            delay(200);
        }
    }

    rclc_executor_add_subscription(&executor, &cmd_vel_subscriber, &cmd_vel_msg, &cmd_vel_callback,
                                   ON_NEW_DATA);
    rclc_executor_add_subscription(&executor, &servo_cmd_subscriber, &servo_cmd_msg,
                                   &servo_cmd_callback, ON_NEW_DATA);
    rclc_executor_add_timer(&executor, &fast_timer_50hz);
    rclc_executor_add_timer(&executor, &scan_timer_5hz);
}

// ── cmd_vel callback ────────────────────────────────────────────────────────
static void cmd_vel_callback(const void* msg_in) {
    const geometry_msgs__msg__Twist* msg = (const geometry_msgs__msg__Twist*)msg_in;
    safety_notify_cmd_vel();

#ifndef UNIT_TEST
    static unsigned long last_log_ms = 0;
    unsigned long now_ms = millis();
    if (now_ms - last_log_ms >= 1000) {
        ros_logf("cmd_vel", "lin=%.2f ang=%.2f", msg->linear.x, msg->angular.z);
        last_log_ms = now_ms;
    }
#endif

    if (safety_is_motion_allowed()) {
        motors_apply_cmd_vel(msg->linear.x, msg->angular.z);
    }
}

/**
 * Process an incoming /servo_cmd JointState.
 * Only camera_pan_joint is honored; any other joint name (including tilt) is
 * ignored by design — the tilt servo has been removed from the hardware.
 */
static void servo_cmd_callback(const void* msg_in) {
    const sensor_msgs__msg__JointState* msg = (const sensor_msgs__msg__JointState*)msg_in;

    for (size_t i = 0; i < msg->name.size && i < msg->position.size; i++) {
        const char* name = msg->name.data[i].data;
        float rad = (float)msg->position.data[i];

        if (strcmp(name, "camera_pan_joint") == 0) {
            ros_logf("servo_cmd", "pan=%.2f rad", rad);
            servos_set_pan(rad);
        }
    }
}

// ── Fast timer callback (50 Hz) — odom, IMU, joint_states ──────────────────
static void fast_timer_callback(rcl_timer_t* timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    safety_check();

    fill_timestamp(&odom_msg.header.stamp);

    encoders_update_odometry();

    odom_msg.pose.pose.position.x = encoders_get_x();
    odom_msg.pose.pose.position.y = encoders_get_y();
    odom_msg.pose.pose.position.z = 0.0;

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

    joint_states_msg.header.stamp = odom_msg.header.stamp;
    joint_positions_data[0] = (double)servos_get_pan();
    rcl_publish(&joint_states_publisher, &joint_states_msg, NULL);

    static unsigned long last_fast_log_ms = 0;
    unsigned long now_ms = millis();
    if (now_ms - last_fast_log_ms >= 1000) {
        ros_logf("odom", "x=%.3f y=%.3f theta=%.3f lin=%.3f ang=%.3f", encoders_get_x(),
                 encoders_get_y(), encoders_get_theta(), encoders_get_linear_vel(),
                 encoders_get_angular_vel());
        if (imu_is_enabled()) {
            ros_log("imu", "IMU data published");
        }
        ros_logf("joint_states", "pan=%.3f rad", (float)joint_positions_data[0]);
        last_fast_log_ms = now_ms;
    }
}

// ── Scan timer callback (5 Hz) — LaserScan ─────────────────────────────────
static void scan_timer_callback(rcl_timer_t* timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    if (!lidar_is_active()) return;

    if (lidar_is_scan_ready()) {
        fill_timestamp(&scan_msg.header.stamp);
        memcpy(scan_ranges_data, lidar_get_ranges(), sizeof(float) * SCAN_POINTS);
        rcl_publish(&scan_publisher, &scan_msg, NULL);
        lidar_clear_scan_ready();

        static unsigned long last_scan_log_ms = 0;
        unsigned long now_ms = millis();
        if (now_ms - last_scan_log_ms >= 1000) {
            ros_log("scan", "LaserScan published");
            last_scan_log_ms = now_ms;
        }
    }
}
#endif
