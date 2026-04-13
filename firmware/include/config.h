#pragma once
// ═══════════════════════════════════════════════════════════════════════════════
// SLAM Tracking Car — Shared Configuration
// ═══════════════════════════════════════════════════════════════════════════════

// ── Math constants (fallback for unit tests without Arduino.h) ─────────────
#ifndef PI
#define PI 3.14159265358979323846f
#endif

// ── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ── micro-ROS Agent ─────────────────────────────────────────────────────────
#define AGENT_IP        "192.168.1.100"    // IP of machine running devcontainer
#ifndef AGENT_PORT
#define AGENT_PORT      8888
#endif

// ── Motor pins (TB6612FNG) ─────────────────────────────────────────────────
// Left motor
#define MOTOR_LEFT_PWMA  25    // PWM speed control
#define MOTOR_LEFT_AIN1  26    // Direction pin 1
#define MOTOR_LEFT_AIN2  27    // Direction pin 2
// Right motor
#define MOTOR_RIGHT_PWMB 14    // PWM speed control
#define MOTOR_RIGHT_BIN1 23    // Direction pin 1
#define MOTOR_RIGHT_BIN2 13    // Direction pin 2
// Note: TB6612 STBY pin tied to VCC (always active)

// ── LEDC PWM Channels ──────────────────────────────────────────────────────
// Channels 0-2: managed by manual ledcSetup()/ledcAttachPin()
// Channels 3-4: managed by ESP32Servo — MUST pass to servo.attach(pin, min, max, CH)
#define LEDC_CH_MOTOR_LEFT   0   // 1 kHz, 8-bit
#define LEDC_CH_MOTOR_RIGHT  1   // 1 kHz, 8-bit
#define LEDC_CH_LIDAR_MOTOR  2   // 25 kHz, 8-bit
#define LEDC_CH_SERVO_PAN    3   // 50 Hz, 16-bit (ESP32Servo)
#define LEDC_CH_SERVO_TILT   4   // 50 Hz, 16-bit (ESP32Servo)

// ── Encoder pins ────────────────────────────────────────────────────────────
#define ENCODER_LEFT_PIN   32    // Phase A, hardware interrupt
#define ENCODER_RIGHT_PIN  33    // Phase A, hardware interrupt
#define ENCODER_PPR        20    // Pulses per revolution (single-phase)

// ── IMU (MPU6050 via I2C) ──────────────────────────────────────────────────
#define IMU_SDA_PIN  21          // I2C Data (ESP32 default)
#define IMU_SCL_PIN  22          // I2C Clock (ESP32 default)
#define IMU_ADDR     0x68        // MPU6050 default I2C address

// ── Servo Pan-Tilt ─────────────────────────────────────────────────────────
#define SERVO_PAN_PIN   18       // Servo 1 — horizontal pan
#define SERVO_TILT_PIN  19       // Servo 2 — vertical tilt
#define SERVO_CENTER    90       // Center position (degrees)

// ── LiDAR (LDS02RR via UART) ───────────────────────────────────────────────
#define LIDAR_UART_NUM   2
#define LIDAR_TX_PIN     17      // Declared for Serial2 init (not physically connected)
#define LIDAR_RX_PIN     16      // LDS02RR TX → ESP32 RX2
#define LIDAR_BAUD       115200
#define LIDAR_MOTOR_PIN  4       // PWM pin for LiDAR motor speed control
#define SCAN_POINTS      360     // Number of points per 360° scan

// ── Status LED ──────────────────────────────────────────────────────────────
#define LED_STATUS_PIN   2       // Built-in LED for status indication

// ── Robot geometry (for odometry) ───────────────────────────────────────────
#define WHEEL_RADIUS     0.033f   // meters (33mm, diameter 66mm)
#define WHEEL_SEPARATION 0.17f    // meters (170mm, center-to-center)

// ── Safety ──────────────────────────────────────────────────────────────────
#define CMD_VEL_TIMEOUT_MS   1000   // ms without cmd_vel → motors stop
#define LIDAR_TIMEOUT_MS     2000   // ms without LiDAR data → motors stop
#define IMU_INIT_RETRIES     3      // Number of MPU6050 init attempts
#define IMU_RETRY_DELAY_MS   500    // Delay between init retries

// ── ESP32-CAM specific ──────────────────────────────────────────────────────
#ifdef BOARD_ESP32_CAM
#define CAM_STREAM_PORT  80
#define CAM_FRAME_SIZE   FRAMESIZE_QVGA   // 320x240 (safe for PSRAM)
#define CAM_JPEG_QUALITY 12               // 0-63, lower = better quality
#define CAM_FB_COUNT     2                // Double buffering
#endif
