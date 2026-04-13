#ifndef LIDAR_H_
#define LIDAR_H_

/**
 * LiDAR module for LDS02RR via kaiaai/LDS library.
 * 
 * Handles serial communication, motor PWM, scan point accumulation,
 * and data timeout detection.
 */

/**
 * Initialize LiDAR serial and start scanning.
 */
void lidar_init();

/**
 * Process incoming LiDAR serial data.
 * Must be called frequently in loop() to prevent buffer overrun.
 */
void lidar_loop();

/**
 * Check if LiDAR is active (receiving data).
 * @return true if LiDAR data received within timeout period
 */
bool lidar_is_active();

/**
 * Check if a complete scan is ready.
 * @return true if 360-degree scan is complete
 */
bool lidar_is_scan_ready();

/**
 * Get pointer to scan ranges array (360 floats, in meters).
 * Invalid readings are INFINITY.
 * @return Pointer to internal scan buffer (do not free)
 */
const float* lidar_get_ranges();

/**
 * Clear the scan ready flag after publishing.
 */
void lidar_clear_scan_ready();

/**
 * Notify that LiDAR data was received (for safety watchdog).
 * Called internally by scan point callback.
 */
void lidar_notify_data();

/**
 * Get timestamp of last LiDAR data received (for safety timeout check).
 * @return millis() timestamp of last data
 */
unsigned long lidar_get_last_data_time();

/**
 * Set LiDAR active flag (used by safety module on timeout).
 */
void lidar_set_active(bool active);

#endif // LIDAR_H_
