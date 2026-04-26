#ifndef SAFETY_H_
#define SAFETY_H_

/**
 * Safety module for watchdog timers.
 *
 * Monitors cmd_vel and LiDAR data timeouts independently:
 *   - cmd_vel watchdog: stops motors if no /cmd_vel is received within
 *     CMD_VEL_TIMEOUT_MS. Motion resumes on the next cmd_vel message.
 *   - LiDAR data watchdog: marks LiDAR inactive to pause scan publishing if
 *     no data arrives within LIDAR_TIMEOUT_MS. Does NOT stop motors.
 */

/**
 * Initialize safety watchdog timers.
 */
void safety_init();

/**
 * Check all safety conditions and take action if needed.
 *
 * Stops motors on cmd_vel timeout. Marks LiDAR inactive on LiDAR data
 * timeout without affecting motor state. Should be called at a fixed rate
 * (e.g., 50 Hz).
 */
void safety_check();

/**
 * Notify that a cmd_vel message was received.
 * Resets the cmd_vel watchdog timer and allows motion to resume.
 */
void safety_notify_cmd_vel();

/**
 * Check if motion commands are allowed.
 *
 * Returns false only when the cmd_vel watchdog has fired (no command received
 * within CMD_VEL_TIMEOUT_MS). LiDAR status does not affect this check.
 *
 * @return true if motion is permitted, false if cmd_vel watchdog is active.
 */
bool safety_is_motion_allowed();

#endif  // SAFETY_H_
