/**
 * SLAM Tracking Car — ESP32 Main Firmware
 *
 * micro-ROS node providing:
 *   PUB /scan       (sensor_msgs/LaserScan)  — LDS02RR via kaiaai/LDS
 *   PUB /odom       (nav_msgs/Odometry)      — wheel encoder odometry
 *   SUB /cmd_vel    (geometry_msgs/Twist)     — motor commands
 *
 * Build: pio run -e esp32_main -t upload
 */
#include <Arduino.h>
#include <micro_ros_platformio.h>
#include <rcl/rcl.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <sensor_msgs/msg/laser_scan.h>
#include <nav_msgs/msg/odometry.h>
#include <geometry_msgs/msg/twist.h>

#include "config.h"

// ── micro-ROS entities ──────────────────────────────────────────────────────
rcl_allocator_t allocator;
rclc_support_t support;
rcl_node_t node;
rclc_executor_t executor;

// Publishers
rcl_publisher_t scan_publisher;
rcl_publisher_t odom_publisher;
sensor_msgs__msg__LaserScan scan_msg;
nav_msgs__msg__Odometry odom_msg;

// Subscribers
rcl_subscription_t cmd_vel_subscriber;
geometry_msgs__msg__Twist cmd_vel_msg;

// Timer
rcl_timer_t timer;

// ── Forward declarations ────────────────────────────────────────────────────
void setup_motors();
void setup_lidar();
void cmd_vel_callback(const void *msg_in);
void timer_callback(rcl_timer_t *timer, int64_t last_call_time);
void apply_cmd_vel(float linear_x, float angular_z);

// ── Setup ───────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    // WiFi transport for micro-ROS
    set_microros_wifi_transports(
        WIFI_SSID, WIFI_PASSWORD,
        AGENT_IP, AGENT_PORT
    );
    delay(2000);

    // micro-ROS init
    allocator = rcl_get_default_allocator();
    rclc_support_init(&support, 0, NULL, &allocator);
    rclc_node_init_default(&node, "slam_car_esp32", "", &support);

    // Publishers
    rclc_publisher_init_default(
        &scan_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(sensor_msgs, msg, LaserScan),
        "scan"
    );
    rclc_publisher_init_default(
        &odom_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(nav_msgs, msg, Odometry),
        "odom"
    );

    // Subscriber
    rclc_subscription_init_default(
        &cmd_vel_subscriber, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(geometry_msgs, msg, Twist),
        "cmd_vel"
    );

    // Timer (200ms = 5 Hz, matching LDS02RR scan rate)
    rclc_timer_init_default(&timer, &support, RCL_MS_TO_NS(200), timer_callback);

    // Executor
    rclc_executor_init(&executor, &support.context, 2, &allocator);
    rclc_executor_add_subscription(
        &executor, &cmd_vel_subscriber, &cmd_vel_msg,
        &cmd_vel_callback, ON_NEW_DATA
    );
    rclc_executor_add_timer(&executor, &timer);

    // Hardware
    setup_motors();
    setup_lidar();

    Serial.println("[SLAM Car] micro-ROS node started");
}

// ── Loop ────────────────────────────────────────────────────────────────────
void loop() {
    rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10));
}

// ── Motor setup ─────────────────────────────────────────────────────────────
void setup_motors() {
    pinMode(MOTOR_LEFT_IN1, OUTPUT);
    pinMode(MOTOR_LEFT_IN2, OUTPUT);
    pinMode(MOTOR_RIGHT_IN3, OUTPUT);
    pinMode(MOTOR_RIGHT_IN4, OUTPUT);

    // PWM channels for speed control
    ledcSetup(0, 1000, 8);  // Channel 0, 1kHz, 8-bit
    ledcSetup(1, 1000, 8);  // Channel 1, 1kHz, 8-bit
    ledcAttachPin(MOTOR_LEFT_ENA, 0);
    ledcAttachPin(MOTOR_RIGHT_ENB, 1);
}

// ── LiDAR setup ─────────────────────────────────────────────────────────────
void setup_lidar() {
    // TODO: Initialize LDS02RR via kaiaai/LDS library
    // LDS lds;
    // lds.init(LIDAR_UART_NUM, LIDAR_RX_PIN, LIDAR_TX_PIN, LIDAR_BAUD);
    // Setup motor PWM for LiDAR rotation
    ledcSetup(2, 25000, 8);  // Channel 2, 25kHz, 8-bit
    ledcAttachPin(LIDAR_MOTOR_PIN, 2);
    ledcWrite(2, 180);  // ~70% duty for 5 Hz rotation
}

// ── Callbacks ───────────────────────────────────────────────────────────────
void cmd_vel_callback(const void *msg_in) {
    const geometry_msgs__msg__Twist *msg = (const geometry_msgs__msg__Twist *)msg_in;
    apply_cmd_vel(msg->linear.x, msg->angular.z);
}

void timer_callback(rcl_timer_t *timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    // TODO: Read LDS02RR scan data via kaiaai/LDS and populate scan_msg
    // TODO: Calculate odometry from wheel encoders and populate odom_msg

    // Publish scan
    // rcl_publish(&scan_publisher, &scan_msg, NULL);

    // Publish odom
    // rcl_publish(&odom_publisher, &odom_msg, NULL);
}

// ── Motor control (differential drive) ──────────────────────────────────────
void apply_cmd_vel(float linear_x, float angular_z) {
    // Differential drive kinematics
    float left_speed = linear_x - angular_z * WHEEL_SEPARATION / 2.0f;
    float right_speed = linear_x + angular_z * WHEEL_SEPARATION / 2.0f;

    // Normalize to PWM range (0-255)
    int left_pwm = constrain(abs(left_speed) * 255 / 0.3f, 0, 255);
    int right_pwm = constrain(abs(right_speed) * 255 / 0.3f, 0, 255);

    // Left motor direction
    if (left_speed > 0.01f) {
        digitalWrite(MOTOR_LEFT_IN1, HIGH);
        digitalWrite(MOTOR_LEFT_IN2, LOW);
    } else if (left_speed < -0.01f) {
        digitalWrite(MOTOR_LEFT_IN1, LOW);
        digitalWrite(MOTOR_LEFT_IN2, HIGH);
    } else {
        digitalWrite(MOTOR_LEFT_IN1, LOW);
        digitalWrite(MOTOR_LEFT_IN2, LOW);
    }

    // Right motor direction
    if (right_speed > 0.01f) {
        digitalWrite(MOTOR_RIGHT_IN3, HIGH);
        digitalWrite(MOTOR_RIGHT_IN4, LOW);
    } else if (right_speed < -0.01f) {
        digitalWrite(MOTOR_RIGHT_IN3, LOW);
        digitalWrite(MOTOR_RIGHT_IN4, HIGH);
    } else {
        digitalWrite(MOTOR_RIGHT_IN3, LOW);
        digitalWrite(MOTOR_RIGHT_IN4, LOW);
    }

    // Apply PWM
    ledcWrite(0, left_pwm);
    ledcWrite(1, right_pwm);
}
