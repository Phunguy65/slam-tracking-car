/**
 * LiDAR module for LDS02RR via kaiaai/LDS library.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <lds_all_models.h>
#endif

#include "lidar.h"
#include "config.h"

#include <math.h>

// ── LiDAR hardware ──────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static HardwareSerial LidarSerial(LIDAR_UART_NUM);
static LDS_LDS02RR lidar;
#endif

// ── Scan buffer and state ───────────────────────────────────────────────────
static float scan_ranges[SCAN_POINTS];
static volatile bool scan_ready_flag = false;
static unsigned long last_data_time = 0;
static bool lidar_active_flag = true;

// ── LiDAR callbacks (forward declarations) ──────────────────────────────────
#ifndef UNIT_TEST
static void lidar_scan_point_cb(float angle_deg, float distance_mm, float quality, bool scan_completed);
static void lidar_motor_pin_cb(float value, LDS::lds_pin_t pin);
static int lidar_serial_read_cb();
static size_t lidar_serial_write_cb(const uint8_t *buffer, size_t length);
#endif

// ── Public API ──────────────────────────────────────────────────────────────

void lidar_init() {
#ifndef UNIT_TEST
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

    last_data_time = millis();
#endif

    // Initialize scan buffer
    for (int i = 0; i < SCAN_POINTS; i++) {
        scan_ranges[i] = INFINITY;
    }
}

void lidar_loop() {
#ifndef UNIT_TEST
    lidar.loop();
#endif
}

bool lidar_is_active() {
    return lidar_active_flag;
}

bool lidar_is_scan_ready() {
    return scan_ready_flag;
}

const float* lidar_get_ranges() {
    return scan_ranges;
}

void lidar_clear_scan_ready() {
    scan_ready_flag = false;
}

void lidar_notify_data() {
#ifndef UNIT_TEST
    last_data_time = millis();
#endif

    // Re-activate LiDAR if it was in timeout
    if (!lidar_active_flag) {
        lidar_active_flag = true;
#ifndef UNIT_TEST
        Serial.println("[LiDAR] Data resumed");
#endif
    }
}

// ── Internal: Check for data timeout (called by safety module) ─────────────
// Note: The safety module handles the timeout check and motor stop.
// This function allows safety module to query last data time if needed.
unsigned long lidar_get_last_data_time() {
    return last_data_time;
}

void lidar_set_active(bool active) {
    lidar_active_flag = active;
}

// ── LiDAR callbacks ─────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static void lidar_scan_point_cb(float angle_deg, float distance_mm, float quality, bool scan_completed) {
    lidar_notify_data();

    if (scan_completed) {
        scan_ready_flag = true;
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

static void lidar_motor_pin_cb(float value, LDS::lds_pin_t pin) {
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

static int lidar_serial_read_cb() {
    return LidarSerial.read();
}

static size_t lidar_serial_write_cb(const uint8_t *buffer, size_t length) {
    return LidarSerial.write(buffer, length);
}
#endif
