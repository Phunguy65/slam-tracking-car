/**
 * IMU module for MPU6050.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#endif

#include "imu.h"
#include "config.h"

#include <math.h>

// ── IMU instance ────────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static MPU6050 mpu;
#endif

// ── IMU state ───────────────────────────────────────────────────────────────
static bool imu_enabled_flag = false;

// Converted values (m/s^2 and rad/s)
static float accel_x = 0.0f;
static float accel_y = 0.0f;
static float accel_z = 0.0f;
static float gyro_x = 0.0f;
static float gyro_y = 0.0f;
static float gyro_z = 0.0f;

// ── Public API ──────────────────────────────────────────────────────────────

void imu_init() {
#ifndef UNIT_TEST
    Wire.begin(IMU_SDA_PIN, IMU_SCL_PIN);

    for (int attempt = 0; attempt < IMU_INIT_RETRIES; attempt++) {
        mpu.initialize();
        if (mpu.testConnection()) {
            imu_enabled_flag = true;
            Serial.printf("[IMU] MPU6050 initialized (attempt %d)\n", attempt + 1);
            return;
        }
        Serial.printf("[IMU] Init failed, attempt %d/%d\n", attempt + 1, IMU_INIT_RETRIES);
        delay(IMU_RETRY_DELAY_MS);
    }

    imu_enabled_flag = false;
    Serial.println("[IMU] WARNING: MPU6050 disabled after all retries failed");
#endif
}

bool imu_is_enabled() {
    return imu_enabled_flag;
}

void imu_read() {
    if (!imu_enabled_flag) return;

#ifndef UNIT_TEST
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    // Convert raw accelerometer to m/s^2 (default ±2g range, 16384 LSB/g)
    accel_x = (float)ax / 16384.0f * 9.81f;
    accel_y = (float)ay / 16384.0f * 9.81f;
    accel_z = (float)az / 16384.0f * 9.81f;

    // Convert raw gyroscope to rad/s (default ±250°/s range, 131 LSB/°/s)
    gyro_x = (float)gx / 131.0f * (PI / 180.0f);
    gyro_y = (float)gy / 131.0f * (PI / 180.0f);
    gyro_z = (float)gz / 131.0f * (PI / 180.0f);
#endif
}

float imu_get_accel_x() {
    return accel_x;
}

float imu_get_accel_y() {
    return accel_y;
}

float imu_get_accel_z() {
    return accel_z;
}

float imu_get_gyro_x() {
    return gyro_x;
}

float imu_get_gyro_y() {
    return gyro_y;
}

float imu_get_gyro_z() {
    return gyro_z;
}
