/**
 * IMU module for MPU6050.
 *
 * Raw sensor readings are converted into SI units (m/s^2 for linear
 * acceleration, rad/s for angular velocity) using the MPU6050 default
 * sensitivities: ±2g range → 16384 LSB/g, ±250°/s range → 131 LSB/(°/s).
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <MPU6050.h>
#include <Wire.h>
#endif

#include <math.h>

#include "config.h"
#include "imu.h"
#include "logger.h"

// ── IMU instance ────────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static MPU6050 mpu;
#endif

// ── IMU state (SI units: m/s^2, rad/s) ──────────────────────────────────────
static bool imu_enabled_flag = false;

static float accel_x = 0.0f;
static float accel_y = 0.0f;
static float accel_z = 0.0f;
static float gyro_x = 0.0f;
static float gyro_y = 0.0f;
static float gyro_z = 0.0f;

#ifndef UNIT_TEST
static const float ACCEL_LSB_PER_G = 16384.0f;
static const float GRAVITY_MS2 = 9.81f;
static const float GYRO_LSB_PER_DEG_PER_S = 131.0f;
static const float DEG_PER_S_TO_RAD_PER_S = (float)PI / 180.0f;
#endif

// ── Public API ──────────────────────────────────────────────────────────────

void imu_init() {
#ifndef UNIT_TEST
    Wire.begin(IMU_SDA_PIN, IMU_SCL_PIN);

    for (int attempt = 0; attempt < IMU_INIT_RETRIES; attempt++) {
        mpu.initialize();
        if (mpu.testConnection()) {
            imu_enabled_flag = true;
            ros_logf("IMU", "MPU6050 initialized (attempt %d)", attempt + 1);
            return;
        }
        ros_logf("IMU", "Init failed, attempt %d/%d", attempt + 1, IMU_INIT_RETRIES);
        delay(IMU_RETRY_DELAY_MS);
    }

    imu_enabled_flag = false;
    ros_log("IMU", "WARNING: MPU6050 disabled after all retries failed");
#endif
}

bool imu_is_enabled() { return imu_enabled_flag; }

void imu_read() {
    if (!imu_enabled_flag) return;

#ifndef UNIT_TEST
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    accel_x = (float)ax / ACCEL_LSB_PER_G * GRAVITY_MS2;
    accel_y = (float)ay / ACCEL_LSB_PER_G * GRAVITY_MS2;
    accel_z = (float)az / ACCEL_LSB_PER_G * GRAVITY_MS2;

    gyro_x = (float)gx / GYRO_LSB_PER_DEG_PER_S * DEG_PER_S_TO_RAD_PER_S;
    gyro_y = (float)gy / GYRO_LSB_PER_DEG_PER_S * DEG_PER_S_TO_RAD_PER_S;
    gyro_z = (float)gz / GYRO_LSB_PER_DEG_PER_S * DEG_PER_S_TO_RAD_PER_S;
#endif
}

float imu_get_accel_x() { return accel_x; }

float imu_get_accel_y() { return accel_y; }

float imu_get_accel_z() { return accel_z; }

float imu_get_gyro_x() { return gyro_x; }

float imu_get_gyro_y() { return gyro_y; }

float imu_get_gyro_z() { return gyro_z; }
