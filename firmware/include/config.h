#pragma once
// ═══════════════════════════════════════════════════════════════════════════════
// SLAM Tracking Car — Shared Configuration
// ═══════════════════════════════════════════════════════════════════════════════

// ── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ── micro-ROS Agent ─────────────────────────────────────────────────────────
#define AGENT_IP        "192.168.1.100"    // IP of machine running devcontainer
#ifndef AGENT_PORT
#define AGENT_PORT      8888
#endif

// ── Motor pins (L298N) ─────────────────────────────────────────────────────
#define MOTOR_LEFT_IN1   12
#define MOTOR_LEFT_IN2   13
#define MOTOR_LEFT_ENA   14
#define MOTOR_RIGHT_IN3  26
#define MOTOR_RIGHT_IN4  27
#define MOTOR_RIGHT_ENB  25

// ── Servo ───────────────────────────────────────────────────────────────────
#define SERVO_PIN        18

// ── LiDAR (LDS02RR via UART) ───────────────────────────────────────────────
#define LIDAR_UART_NUM   2
#define LIDAR_TX_PIN     17
#define LIDAR_RX_PIN     16
#define LIDAR_BAUD       115200
#define LIDAR_MOTOR_PIN  19     // PWM pin for LiDAR motor speed control

// ── Robot geometry (for odometry) ───────────────────────────────────────────
#define WHEEL_RADIUS     0.033f   // meters
#define WHEEL_SEPARATION 0.17f    // meters

// ── ESP32-CAM specific ──────────────────────────────────────────────────────
#ifdef BOARD_ESP32_CAM
#define CAM_STREAM_PORT  80
#define CAM_FRAME_SIZE   FRAMESIZE_QVGA   // 320x240 (safe for PSRAM)
#define CAM_JPEG_QUALITY 12               // 0-63, lower = better quality
#define CAM_FB_COUNT     2                // Double buffering
#endif
