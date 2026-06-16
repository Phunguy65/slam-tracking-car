#pragma once
// ═══════════════════════════════════════════════════════════════════════════════
// SLAM Tracking Car — Shared Configuration
//
// Most values are loaded from firmware/.env via load_env.py extra script.
// This file contains:
//   1. Compile-time validation (#error if required vars missing)
//   2. Derived constants (LEDC channels, robot geometry, safety timeouts)
//
// Setup:
//   cd firmware
//   cp .env.example .env
//   # Edit .env with your WiFi credentials and GPIO pins
// ═══════════════════════════════════════════════════════════════════════════════

// ── Math constants (fallback for unit tests without Arduino.h) ─────────────
#ifndef PI
#define PI 3.14159265358979323846f
#endif

// ═══════════════════════════════════════════════════════════════════════════════
// COMPILE-TIME VALIDATION — Required variables from .env
// ═══════════════════════════════════════════════════════════════════════════════

// ── WiFi (REQUIRED) ────────────────────────────────────────────────────────────
#ifndef WIFI_SSID
#error "WIFI_SSID not defined — check firmware/.env (copy from .env.example)"
#endif

#ifndef WIFI_PASSWORD
#error "WIFI_PASSWORD not defined — check firmware/.env"
#endif

// ── micro-ROS Agent (REQUIRED) ─────────────────────────────────────────────────
#ifndef AGENT_IP
#error "AGENT_IP not defined — check firmware/.env"
#endif

#ifndef AGENT_PORT
#error "AGENT_PORT not defined — check firmware/.env"
#endif

// ── Motor pins - TB6612FNG (REQUIRED) ──────────────────────────────────────────
#ifndef MOTOR_LEFT_PWMA
#error "MOTOR_LEFT_PWMA not defined — check firmware/.env"
#endif

#ifndef MOTOR_LEFT_AIN1
#error "MOTOR_LEFT_AIN1 not defined — check firmware/.env"
#endif

#ifndef MOTOR_LEFT_AIN2
#error "MOTOR_LEFT_AIN2 not defined — check firmware/.env"
#endif

#ifndef MOTOR_RIGHT_PWMB
#error "MOTOR_RIGHT_PWMB not defined — check firmware/.env"
#endif

#ifndef MOTOR_RIGHT_BIN1
#error "MOTOR_RIGHT_BIN1 not defined — check firmware/.env"
#endif

#ifndef MOTOR_RIGHT_BIN2
#error "MOTOR_RIGHT_BIN2 not defined — check firmware/.env"
#endif

// ── Encoder pins (REQUIRED) ────────────────────────────────────────────────────
#ifndef ENCODER_LEFT_PIN
#error "ENCODER_LEFT_PIN not defined — check firmware/.env"
#endif

#ifndef ENCODER_RIGHT_PIN
#error "ENCODER_RIGHT_PIN not defined — check firmware/.env"
#endif

#ifndef ENCODER_PPR
#error "ENCODER_PPR not defined — check firmware/.env"
#endif

// ── IMU - MPU6050 (REQUIRED) ───────────────────────────────────────────────────
#ifndef IMU_SDA_PIN
#error "IMU_SDA_PIN not defined — check firmware/.env"
#endif

#ifndef IMU_SCL_PIN
#error "IMU_SCL_PIN not defined — check firmware/.env"
#endif

#ifndef IMU_ADDR
#error "IMU_ADDR not defined — check firmware/.env"
#endif

// ── Servo pan (REQUIRED) ───────────────────────────────────────────────────────
// Note: Tilt servo removed per design decision (pan-only tracking).
// SERVO_TILT_PIN may still be defined in .env but is not used.
#ifndef SERVO_PAN_PIN
#error "SERVO_PAN_PIN not defined — check firmware/.env"
#endif

// ── LiDAR - LDS02RR (REQUIRED) ─────────────────────────────────────────────────
#ifndef LIDAR_RX_PIN
#error "LIDAR_RX_PIN not defined — check firmware/.env"
#endif

#ifndef LIDAR_TX_PIN
#error "LIDAR_TX_PIN not defined — check firmware/.env"
#endif

#ifndef LIDAR_MOTOR_PIN
#error "LIDAR_MOTOR_PIN not defined — check firmware/.env"
#endif

// ── Status LED (REQUIRED) ──────────────────────────────────────────────────────
#ifndef LED_STATUS_PIN
#error "LED_STATUS_PIN not defined — check firmware/.env"
#endif

// ── ESP32-CAM specific (REQUIRED for esp32_cam environments) ──────────────────
#ifdef BOARD_ESP32_CAM

#ifndef CAM_STREAM_PORT
#error "CAM_STREAM_PORT not defined — check firmware/.env"
#endif

#ifndef CAM_FRAME_SIZE
#error "CAM_FRAME_SIZE not defined — check firmware/.env"
#endif

#ifndef CAM_JPEG_QUALITY
#error "CAM_JPEG_QUALITY not defined — check firmware/.env"
#endif

// Camera frame buffer count (not in .env — hardware constant)
#define CAM_FB_COUNT 2

#endif  // BOARD_ESP32_CAM

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED CONSTANTS — Computed from .env values or hardware constraints
// ═══════════════════════════════════════════════════════════════════════════════

// ── LEDC PWM Channels ──────────────────────────────────────────────────────────
// Channels 0-2: managed by manual ledcSetup()/ledcAttachPin()
// Servo pan: managed by ESP32Servo on timer 2 (auto-allocated channel)
#define LEDC_CH_MOTOR_LEFT 0   // 1 kHz, 8-bit
#define LEDC_CH_MOTOR_RIGHT 1  // 1 kHz, 8-bit
#define LEDC_CH_LIDAR_MOTOR 2  // 25 kHz, 8-bit

// ── LiDAR constants ────────────────────────────────────────────────────────────
#define LIDAR_UART_NUM 2
#define LIDAR_BAUD 115200
#define SCAN_POINTS 360  // Number of points per 360° scan

// ── Servo constants ────────────────────────────────────────────────────────────
#define SERVO_CENTER 90  // Center position (degrees)

// ── Robot geometry (for odometry) ──────────────────────────────────────────────
#define WHEEL_RADIUS 0.033f     // meters (33mm, diameter 66mm)
#define WHEEL_SEPARATION 0.12f  // meters (120mm, center-to-center)

// ── Safety timeouts ────────────────────────────────────────────────────────────
#define CMD_VEL_TIMEOUT_MS 1000      // ms without cmd_vel → motors stop
#define LIDAR_TIMEOUT_MS 2000        // ms without LiDAR data → motors stop
#define IMU_INIT_RETRIES 3           // Number of MPU6050 init attempts
#define IMU_RETRY_DELAY_MS 500       // Delay between init retries
#define AGENT_PING_INTERVAL_MS 2000  // ms between agent connectivity checks
