#ifndef IMU_H_
#define IMU_H_

/**
 * IMU module for MPU6050.
 * 
 * Handles I2C initialization, reading, and unit conversion.
 * Provides calibrated acceleration (m/s^2) and angular velocity (rad/s).
 */

/**
 * Initialize MPU6050 over I2C.
 * Retries up to IMU_INIT_RETRIES times on failure.
 */
void imu_init();

/**
 * Check if IMU is enabled and functioning.
 * @return true if IMU initialized successfully
 */
bool imu_is_enabled();

/**
 * Read new data from MPU6050 and update internal state.
 * Call this before reading accel/gyro values.
 */
void imu_read();

/**
 * Get X-axis linear acceleration in m/s^2.
 */
float imu_get_accel_x();

/**
 * Get Y-axis linear acceleration in m/s^2.
 */
float imu_get_accel_y();

/**
 * Get Z-axis linear acceleration in m/s^2.
 */
float imu_get_accel_z();

/**
 * Get X-axis angular velocity in rad/s.
 */
float imu_get_gyro_x();

/**
 * Get Y-axis angular velocity in rad/s.
 */
float imu_get_gyro_y();

/**
 * Get Z-axis angular velocity in rad/s.
 */
float imu_get_gyro_z();

#endif // IMU_H_
