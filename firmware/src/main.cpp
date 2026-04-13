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

#include "config.h"
#include "motors.h"
#include "encoders.h"
#include "imu.h"
#include "lidar.h"
#include "servos.h"
#include "safety.h"
#include "ros_bridge.h"

// ── Setup ───────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    pinMode(LED_STATUS_PIN, OUTPUT);
    digitalWrite(LED_STATUS_PIN, LOW);

    // Hardware init
    motors_init();
    encoders_init();
    imu_init();
    lidar_init();
    servos_init();
    safety_init();

    // micro-ROS init (includes WiFi transport setup)
    ros_bridge_init();

    digitalWrite(LED_STATUS_PIN, HIGH);  // Solid LED = connected
}

// ── Loop ────────────────────────────────────────────────────────────────────
void loop() {
    // Process LiDAR serial data (must be called frequently)
    lidar_loop();

    // Spin micro-ROS executor
    ros_bridge_spin();
}
