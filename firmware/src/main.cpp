/**
 * SLAM Tracking Car — ESP32 Main Firmware
 *
 * micro-ROS node providing:
 *   PUB /scan          (sensor_msgs/LaserScan)   — LDS02RR via kaiaai/LDS
 *   PUB /odom          (nav_msgs/Odometry)       — wheel encoder odometry
 *   PUB /imu/data_raw  (sensor_msgs/Imu)         — MPU6050 raw accel+gyro
 *   PUB /joint_states  (sensor_msgs/JointState)  — servo pan-tilt positions
 *   SUB /cmd_vel       (geometry_msgs/Twist)      — motor commands
 *   SUB /servo_cmd     (sensor_msgs/JointState)   — servo pan-tilt commands
 *
 * Hardware: TB6612FNG motors, LDS02RR LiDAR, MPU6050 IMU,
 *           2x wheel encoders (20 PPR), 2x servos (pan-tilt)
 *
 * Build: pio run -e esp32_main -t upload
 */
#include <Arduino.h>
#include <Wire.h>
#include <micro_ros_platformio.h>
#include <rcl/rcl.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <rmw_microros/rmw_microros.h>  // Time sync API
#include <sensor_msgs/msg/laser_scan.h>
#include <nav_msgs/msg/odometry.h>
#include <geometry_msgs/msg/twist.h>
#include <sensor_msgs/msg/imu.h>
#include <sensor_msgs/msg/joint_state.h>
#include <MPU6050.h>
#include <ESP32Servo.h>
#include <lds_all_models.h>
#include <rosidl_runtime_c/string_functions.h>

#include "config.h"

// ── Constants ───────────────────────────────────────────────────────────────
static const float TICKS_TO_METERS = (2.0f * PI * WHEEL_RADIUS) / (float)ENCODER_PPR;
static const int SCAN_POINTS = 360;
static const float MAX_LINEAR_SPEED = 0.3f; // m/s for PWM normalization
static const int LED_PIN = 2; // Built-in LED for status

// ── micro-ROS entities ──────────────────────────────────────────────────────
rcl_allocator_t allocator;
rclc_support_t support;
rcl_node_t node;
rclc_executor_t executor;

// Publishers
rcl_publisher_t scan_publisher;
rcl_publisher_t odom_publisher;
rcl_publisher_t imu_publisher;
rcl_publisher_t joint_states_publisher;

// Messages
sensor_msgs__msg__LaserScan scan_msg;
nav_msgs__msg__Odometry odom_msg;
sensor_msgs__msg__Imu imu_msg;
sensor_msgs__msg__JointState joint_states_msg;

// Subscribers
rcl_subscription_t cmd_vel_subscriber;
rcl_subscription_t servo_cmd_subscriber;
geometry_msgs__msg__Twist cmd_vel_msg;
sensor_msgs__msg__JointState servo_cmd_msg;

// Timers
rcl_timer_t fast_timer;   // 50 Hz — odom, IMU, joint_states
rcl_timer_t scan_timer;   // 5 Hz  — LaserScan

// ── Spinlock for encoder critical section ───────────────────────────────────
static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

// ── Encoder state ───────────────────────────────────────────────────────────
volatile long encoder_left_ticks = 0;
volatile long encoder_right_ticks = 0;

// Motor direction tracking: 1 = forward, -1 = backward, 0 = stop
volatile int left_motor_dir = 0;
volatile int right_motor_dir = 0;

// Odometry state
float odom_x = 0.0f;
float odom_y = 0.0f;
float odom_theta = 0.0f;
float odom_linear_vel = 0.0f;
float odom_angular_vel = 0.0f;
unsigned long last_odom_time = 0;

// ── IMU state ───────────────────────────────────────────────────────────────
MPU6050 mpu;
bool imu_enabled = false;

// ── Servo state ─────────────────────────────────────────────────────────────
Servo servo_pan;
Servo servo_tilt;
float servo_pan_rad = 0.0f;   // Current pan position (radians)
float servo_tilt_rad = 0.0f;  // Current tilt position (radians)

// ── LiDAR state ─────────────────────────────────────────────────────────────
HardwareSerial LidarSerial(LIDAR_UART_NUM);
LDS_LDS02RR lidar;
float scan_ranges[SCAN_POINTS];
volatile bool scan_ready = false;  // volatile: shared between lidar callback and timer
unsigned long last_lidar_data_time = 0;
bool lidar_active = true;

// ── Safety state ────────────────────────────────────────────────────────────
unsigned long last_cmd_vel_time = 0;
bool motors_stopped_by_watchdog = false;

// ── JointState string storage ───────────────────────────────────────────────
// Pre-allocated strings for JointState messages
static rosidl_runtime_c__String joint_names_data[2];
static double joint_positions_data[2];
static double joint_velocities_data[2];
static double joint_efforts_data[2];

static rosidl_runtime_c__String servo_cmd_names_data[2];
static double servo_cmd_positions_data[2];

// ── LaserScan data storage ──────────────────────────────────────────────────
static float scan_ranges_data[SCAN_POINTS];
static float scan_intensities_data[SCAN_POINTS];

// ── Forward declarations ────────────────────────────────────────────────────
void setup_motors();
void setup_encoders();
void setup_imu();
void setup_lidar();
void setup_servos();
void setup_micro_ros();
void setup_messages();
void stop_motors();

void cmd_vel_callback(const void *msg_in);
void servo_cmd_callback(const void *msg_in);
void fast_timer_callback(rcl_timer_t *timer, int64_t last_call_time);
void scan_timer_callback(rcl_timer_t *timer, int64_t last_call_time);

void apply_cmd_vel(float linear_x, float angular_z);
void compute_odometry();
void read_imu();
void publish_joint_states();
void check_safety();

// LiDAR callbacks
void lidar_scan_point_cb(float angle_deg, float distance_mm, float quality, bool scan_completed);
void lidar_motor_pin_cb(float value, LDS::lds_pin_t pin);
int lidar_serial_read_cb();
size_t lidar_serial_write_cb(const uint8_t *buffer, size_t length);

// ── Time sync helper ────────────────────────────────────────────────────────
// Populate ROS2 message header.stamp with current time from micro-ROS agent
inline void fill_timestamp(builtin_interfaces__msg__Time *stamp) {
    int64_t now_ns = rmw_uros_epoch_nanos();
    stamp->sec = (int32_t)(now_ns / 1000000000LL);
    stamp->nanosec = (uint32_t)(now_ns % 1000000000LL);
}

// ── Encoder ISRs ────────────────────────────────────────────────────────────
void IRAM_ATTR encoder_left_isr() {
    encoder_left_ticks += left_motor_dir;
}

void IRAM_ATTR encoder_right_isr() {
    encoder_right_ticks += right_motor_dir;
}

// ── Setup ───────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // WiFi transport for micro-ROS
    // Parse AGENT_IP string to IPAddress
    IPAddress agent_ip;
    agent_ip.fromString(AGENT_IP);
    set_microros_wifi_transports(
        (char*)WIFI_SSID, (char*)WIFI_PASSWORD,
        agent_ip, AGENT_PORT
    );
    delay(2000);

    // Hardware init
    setup_motors();
    setup_encoders();
    setup_imu();
    setup_lidar();
    setup_servos();

    // micro-ROS init
    setup_messages();
    setup_micro_ros();

    last_cmd_vel_time = millis();
    last_odom_time = millis();
    last_lidar_data_time = millis();

    digitalWrite(LED_PIN, HIGH); // Solid LED = connected
    Serial.println("[SLAM Car] micro-ROS node started");
}

// ── Loop ────────────────────────────────────────────────────────────────────
void loop() {
    // Process LiDAR serial data (must be called frequently)
    lidar.loop();

    // Spin micro-ROS executor
    rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10));
}

// ── Motor setup (TB6612FNG) ─────────────────────────────────────────────────
void setup_motors() {
    // Direction pins
    pinMode(MOTOR_LEFT_AIN1, OUTPUT);
    pinMode(MOTOR_LEFT_AIN2, OUTPUT);
    pinMode(MOTOR_RIGHT_BIN1, OUTPUT);
    pinMode(MOTOR_RIGHT_BIN2, OUTPUT);

    // PWM channels for speed control
    ledcSetup(LEDC_CH_MOTOR_LEFT, 1000, 8);   // 1 kHz, 8-bit
    ledcSetup(LEDC_CH_MOTOR_RIGHT, 1000, 8);  // 1 kHz, 8-bit
    ledcAttachPin(MOTOR_LEFT_PWMA, LEDC_CH_MOTOR_LEFT);
    ledcAttachPin(MOTOR_RIGHT_PWMB, LEDC_CH_MOTOR_RIGHT);

    stop_motors();
}

// ── Encoder setup ───────────────────────────────────────────────────────────
void setup_encoders() {
    pinMode(ENCODER_LEFT_PIN, INPUT_PULLUP);
    pinMode(ENCODER_RIGHT_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(ENCODER_LEFT_PIN), encoder_left_isr, RISING);
    attachInterrupt(digitalPinToInterrupt(ENCODER_RIGHT_PIN), encoder_right_isr, RISING);
}

// ── IMU setup (MPU6050) ─────────────────────────────────────────────────────
void setup_imu() {
    Wire.begin(IMU_SDA_PIN, IMU_SCL_PIN);

    for (int attempt = 0; attempt < IMU_INIT_RETRIES; attempt++) {
        mpu.initialize();
        if (mpu.testConnection()) {
            imu_enabled = true;
            Serial.printf("[IMU] MPU6050 initialized (attempt %d)\n", attempt + 1);
            return;
        }
        Serial.printf("[IMU] Init failed, attempt %d/%d\n", attempt + 1, IMU_INIT_RETRIES);
        delay(IMU_RETRY_DELAY_MS);
    }

    imu_enabled = false;
    Serial.println("[IMU] WARNING: MPU6050 disabled after all retries failed");
}

// ── LiDAR setup (LDS02RR via kaiaai/LDS) ───────────────────────────────────
void setup_lidar() {
    LidarSerial.begin(LIDAR_BAUD, SERIAL_8N1, LIDAR_RX_PIN, LIDAR_TX_PIN);

    // Register callbacks before init
    lidar.setScanPointCallback(lidar_scan_point_cb);
    lidar.setMotorPinCallback(lidar_motor_pin_cb);
    lidar.setSerialReadCallback(lidar_serial_read_cb);
    lidar.setSerialWriteCallback(lidar_serial_write_cb);

    lidar.init();

    LDS::result_t result = lidar.start();
    if (result == LDS::RESULT_OK) {
        lidar.setScanTargetFreqHz(5.0f);
        Serial.println("[LiDAR] LDS02RR started, target 5 Hz");
    } else {
        Serial.printf("[LiDAR] Start failed: %s\n", lidar.resultCodeToString(result));
    }

    // Initialize scan buffer
    for (int i = 0; i < SCAN_POINTS; i++) {
        scan_ranges[i] = INFINITY;
    }
}

// ── Servo setup (Pan-Tilt) ──────────────────────────────────────────────────
void setup_servos() {
    // ESP32Servo handles LEDC channel allocation internally
    // Use 3-arg attach: pin, min_pulse_us, max_pulse_us
    servo_pan.attach(SERVO_PAN_PIN, 500, 2400);
    servo_tilt.attach(SERVO_TILT_PIN, 500, 2400);

    // Center both servos on startup
    servo_pan.write(SERVO_CENTER);
    servo_tilt.write(SERVO_CENTER);

    // 90 degrees = 0 radians in our convention (center)
    servo_pan_rad = 0.0f;
    servo_tilt_rad = 0.0f;
}

// ── Message pre-allocation ──────────────────────────────────────────────────
void setup_messages() {
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
    // Pre-assign joint names
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
void setup_micro_ros() {
    allocator = rcl_get_default_allocator();

    // Critical initialization — must succeed for firmware to operate
    rcl_ret_t ret = rclc_support_init(&support, 0, NULL, &allocator);
    if (ret != RCL_RET_OK) {
        Serial.printf("[micro-ROS] FATAL: rclc_support_init failed (err=%d). Check agent connectivity.\n", (int)ret);
        while (true) {
            digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Blink LED to indicate error
            delay(200);
        }
    }

    ret = rclc_node_init_default(&node, "slam_car_esp32", "", &support);
    if (ret != RCL_RET_OK) {
        Serial.printf("[micro-ROS] FATAL: rclc_node_init failed (err=%d)\n", (int)ret);
        while (true) {
            digitalWrite(LED_PIN, !digitalRead(LED_PIN));
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
            digitalWrite(LED_PIN, !digitalRead(LED_PIN));
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

// ── Stop motors ─────────────────────────────────────────────────────────────
void stop_motors() {
    // Set direction BEFORE changing GPIOs, with critical section to prevent ISR
    // from reading stale direction between GPIO change and direction update
    portENTER_CRITICAL(&mux);
    left_motor_dir = 0;
    right_motor_dir = 0;
    digitalWrite(MOTOR_LEFT_AIN1, LOW);
    digitalWrite(MOTOR_LEFT_AIN2, LOW);
    digitalWrite(MOTOR_RIGHT_BIN1, LOW);
    digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    portEXIT_CRITICAL(&mux);
    ledcWrite(LEDC_CH_MOTOR_LEFT, 0);
    ledcWrite(LEDC_CH_MOTOR_RIGHT, 0);
}

// ── Motor control (differential drive, TB6612FNG) ───────────────────────────
void apply_cmd_vel(float linear_x, float angular_z) {
    // Differential drive kinematics
    float left_speed = linear_x - angular_z * WHEEL_SEPARATION / 2.0f;
    float right_speed = linear_x + angular_z * WHEEL_SEPARATION / 2.0f;

    // Normalize to PWM range (0-255)
    int left_pwm = constrain((int)(fabsf(left_speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);
    int right_pwm = constrain((int)(fabsf(right_speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);

    // Determine directions
    int new_left_dir, new_right_dir;
    if (left_speed > 0.01f) {
        new_left_dir = 1;
    } else if (left_speed < -0.01f) {
        new_left_dir = -1;
    } else {
        new_left_dir = 0;
        left_pwm = 0;
    }

    if (right_speed > 0.01f) {
        new_right_dir = 1;
    } else if (right_speed < -0.01f) {
        new_right_dir = -1;
    } else {
        new_right_dir = 0;
        right_pwm = 0;
    }

    // Critical section: Set direction variables BEFORE GPIO changes to prevent
    // ISR from reading stale direction between GPIO write and direction update
    portENTER_CRITICAL(&mux);
    left_motor_dir = new_left_dir;
    right_motor_dir = new_right_dir;

    // Left motor direction
    if (new_left_dir == 1) {
        digitalWrite(MOTOR_LEFT_AIN1, HIGH);
        digitalWrite(MOTOR_LEFT_AIN2, LOW);
    } else if (new_left_dir == -1) {
        digitalWrite(MOTOR_LEFT_AIN1, LOW);
        digitalWrite(MOTOR_LEFT_AIN2, HIGH);
    } else {
        digitalWrite(MOTOR_LEFT_AIN1, LOW);
        digitalWrite(MOTOR_LEFT_AIN2, LOW);
    }

    // Right motor direction
    if (new_right_dir == 1) {
        digitalWrite(MOTOR_RIGHT_BIN1, HIGH);
        digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    } else if (new_right_dir == -1) {
        digitalWrite(MOTOR_RIGHT_BIN1, LOW);
        digitalWrite(MOTOR_RIGHT_BIN2, HIGH);
    } else {
        digitalWrite(MOTOR_RIGHT_BIN1, LOW);
        digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    }
    portEXIT_CRITICAL(&mux);

    // Apply PWM (outside critical section — PWM duty doesn't affect direction)
    ledcWrite(LEDC_CH_MOTOR_LEFT, left_pwm);
    ledcWrite(LEDC_CH_MOTOR_RIGHT, right_pwm);
}

// ── Odometry computation ────────────────────────────────────────────────────
void compute_odometry() {
    unsigned long now = millis();
    float dt = (float)(now - last_odom_time) / 1000.0f;
    last_odom_time = now;

    if (dt <= 0.0f || dt > 1.0f) return; // Guard against bad timing

    // Read and reset tick counters (critical section — disables interrupts on this core)
    portENTER_CRITICAL(&mux);
    long left_ticks = encoder_left_ticks;
    long right_ticks = encoder_right_ticks;
    encoder_left_ticks = 0;
    encoder_right_ticks = 0;
    portEXIT_CRITICAL(&mux);

    // Convert ticks to distance
    float delta_left = (float)left_ticks * TICKS_TO_METERS;
    float delta_right = (float)right_ticks * TICKS_TO_METERS;

    // Differential drive kinematics
    float delta_s = (delta_left + delta_right) / 2.0f;
    float delta_theta = (delta_right - delta_left) / WHEEL_SEPARATION;

    // Update pose
    odom_x += delta_s * cosf(odom_theta + delta_theta / 2.0f);
    odom_y += delta_s * sinf(odom_theta + delta_theta / 2.0f);
    odom_theta += delta_theta;

    // Normalize theta to [-PI, PI]
    while (odom_theta > PI) odom_theta -= 2.0f * PI;
    while (odom_theta < -PI) odom_theta += 2.0f * PI;

    // Compute velocities
    odom_linear_vel = delta_s / dt;
    odom_angular_vel = delta_theta / dt;

    // Populate odom message
    odom_msg.pose.pose.position.x = odom_x;
    odom_msg.pose.pose.position.y = odom_y;
    odom_msg.pose.pose.position.z = 0.0;

    // Quaternion from yaw
    odom_msg.pose.pose.orientation.w = cosf(odom_theta / 2.0f);
    odom_msg.pose.pose.orientation.x = 0.0;
    odom_msg.pose.pose.orientation.y = 0.0;
    odom_msg.pose.pose.orientation.z = sinf(odom_theta / 2.0f);

    odom_msg.twist.twist.linear.x = odom_linear_vel;
    odom_msg.twist.twist.linear.y = 0.0;  // 2D robot: no lateral velocity
    odom_msg.twist.twist.linear.z = 0.0;
    odom_msg.twist.twist.angular.x = 0.0;
    odom_msg.twist.twist.angular.y = 0.0;
    odom_msg.twist.twist.angular.z = odom_angular_vel;
}

// ── IMU reading ─────────────────────────────────────────────────────────────
void read_imu() {
    if (!imu_enabled) return;

    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    // Convert raw accelerometer to m/s^2 (default ±2g range, 16384 LSB/g)
    imu_msg.linear_acceleration.x = (float)ax / 16384.0f * 9.81f;
    imu_msg.linear_acceleration.y = (float)ay / 16384.0f * 9.81f;
    imu_msg.linear_acceleration.z = (float)az / 16384.0f * 9.81f;

    // Convert raw gyroscope to rad/s (default ±250°/s range, 131 LSB/°/s)
    imu_msg.angular_velocity.x = (float)gx / 131.0f * (PI / 180.0f);
    imu_msg.angular_velocity.y = (float)gy / 131.0f * (PI / 180.0f);
    imu_msg.angular_velocity.z = (float)gz / 131.0f * (PI / 180.0f);
}

// ── Publish joint states ────────────────────────────────────────────────────
void publish_joint_states() {
    joint_positions_data[0] = (double)servo_pan_rad;
    joint_positions_data[1] = (double)servo_tilt_rad;
    rcl_publish(&joint_states_publisher, &joint_states_msg, NULL);
}

// ── Safety checks ───────────────────────────────────────────────────────────
void check_safety() {
    unsigned long now = millis();

    // cmd_vel watchdog (1 second timeout)
    if ((now - last_cmd_vel_time) > CMD_VEL_TIMEOUT_MS) {
        if (!motors_stopped_by_watchdog) {
            stop_motors();
            motors_stopped_by_watchdog = true;
        }
    }

    // LiDAR data watchdog (2 second timeout)
    if (lidar_active && (now - last_lidar_data_time) > LIDAR_TIMEOUT_MS) {
        stop_motors();
        lidar_active = false;
        Serial.println("[SAFETY] LiDAR data timeout — motors stopped");
    }
}

// ── cmd_vel callback ────────────────────────────────────────────────────────
void cmd_vel_callback(const void *msg_in) {
    const geometry_msgs__msg__Twist *msg = (const geometry_msgs__msg__Twist *)msg_in;
    last_cmd_vel_time = millis();
    motors_stopped_by_watchdog = false;

    // Only apply if LiDAR is active
    if (lidar_active) {
        apply_cmd_vel(msg->linear.x, msg->angular.z);
    }
}

// ── servo_cmd callback ──────────────────────────────────────────────────────
void servo_cmd_callback(const void *msg_in) {
    const sensor_msgs__msg__JointState *msg = (const sensor_msgs__msg__JointState *)msg_in;

    for (size_t i = 0; i < msg->name.size && i < msg->position.size; i++) {
        const char *name = msg->name.data[i].data;
        float rad = (float)msg->position.data[i];

        // Convert radians to degrees: 0 rad = 90° (center), range maps to 0-180°
        int deg = constrain((int)(rad * 180.0f / PI + 90.0f), 0, 180);

        if (strcmp(name, "camera_pan_joint") == 0) {
            servo_pan.write(deg);
            servo_pan_rad = rad;
        } else if (strcmp(name, "camera_tilt_joint") == 0) {
            servo_tilt.write(deg);
            servo_tilt_rad = rad;
        }
    }
}

// ── Fast timer callback (50 Hz) — odom, IMU, joint_states ──────────────────
void fast_timer_callback(rcl_timer_t *timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    // Safety checks
    check_safety();

    // Get current timestamp for all messages in this callback
    fill_timestamp(&odom_msg.header.stamp);
    
    // Compute and publish odometry
    compute_odometry();
    rcl_publish(&odom_publisher, &odom_msg, NULL);

    // Read and publish IMU (if enabled)
    read_imu();
    if (imu_enabled) {
        imu_msg.header.stamp = odom_msg.header.stamp;  // Use same timestamp
        rcl_publish(&imu_publisher, &imu_msg, NULL);
    }

    // Publish servo joint states
    joint_states_msg.header.stamp = odom_msg.header.stamp;  // Use same timestamp
    publish_joint_states();
}

// ── Scan timer callback (5 Hz) — LaserScan ─────────────────────────────────
void scan_timer_callback(rcl_timer_t *timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    if (!lidar_active) return;

    if (scan_ready) {
        // Populate timestamp
        fill_timestamp(&scan_msg.header.stamp);
        // Copy accumulated scan data to message
        memcpy(scan_ranges_data, scan_ranges, sizeof(float) * SCAN_POINTS);
        rcl_publish(&scan_publisher, &scan_msg, NULL);
        scan_ready = false;
    }
}

// ── LiDAR scan point callback ───────────────────────────────────────────────
void lidar_scan_point_cb(float angle_deg, float distance_mm, float quality, bool scan_completed) {
    last_lidar_data_time = millis();

    // Re-activate LiDAR if it was in timeout
    if (!lidar_active) {
        lidar_active = true;
        Serial.println("[LiDAR] Data resumed");
    }

    if (scan_completed) {
        scan_ready = true;
        // Clear buffer for next scan to prevent stale data from persisting
        for (int i = 0; i < SCAN_POINTS; i++) scan_ranges[i] = INFINITY;
        return;
    }

    // Map angle to array index (0-359)
    int idx = constrain((int)angle_deg, 0, SCAN_POINTS - 1);

    // Convert mm to meters, mark invalid as INFINITY
    if (distance_mm > 0.0f) {
        float dist_m = distance_mm / 1000.0f;
        if (dist_m >= 0.13f && dist_m <= 8.0f) {
            scan_ranges[idx] = dist_m;
        } else {
            scan_ranges[idx] = INFINITY;
        }
    } else {
        scan_ranges[idx] = INFINITY;
    }
}

// ── LiDAR motor pin callback ────────────────────────────────────────────────
void lidar_motor_pin_cb(float value, LDS::lds_pin_t pin) {
    // Only handle motor PWM pin — LDS02RR uses single PWM pin for motor control
    // Ignore callbacks for other pin types to prevent wrong-GPIO issues
    if (pin != LDS::LDS_MOTOR_PWM_PIN) return;

    int gpio = LIDAR_MOTOR_PIN;
    static bool ledc_initialized = false;

    if (value <= (float)LDS::DIR_INPUT) {
        if (value == (float)LDS::DIR_OUTPUT_PWM) {
            // Only initialize LEDC once to prevent motor stutter on reinit
            if (!ledc_initialized) {
                ledcSetup(LEDC_CH_LIDAR_MOTOR, 25000, 8);  // 25 kHz, 8-bit
                ledcAttachPin(gpio, LEDC_CH_LIDAR_MOTOR);
                ledc_initialized = true;
            }
        } else {
            pinMode(gpio, (value == (float)LDS::DIR_INPUT) ? INPUT : OUTPUT);
        }
    } else if (value < (float)LDS::VALUE_PWM) {
        digitalWrite(gpio, (value == (float)LDS::VALUE_HIGH) ? HIGH : LOW);
    } else {
        // PWM duty cycle (0.0 - 1.0) → 8-bit value (0-255)
        int pwm_val = (int)(value * 255.0f);
        ledcWrite(LEDC_CH_LIDAR_MOTOR, pwm_val);
    }
}

// ── LiDAR serial callbacks ──────────────────────────────────────────────────
int lidar_serial_read_cb() {
    return LidarSerial.read();
}

size_t lidar_serial_write_cb(const uint8_t *buffer, size_t length) {
    return LidarSerial.write(buffer, length);
}
