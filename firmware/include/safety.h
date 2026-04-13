#ifndef SAFETY_H_
#define SAFETY_H_

/**
 * Safety module for watchdog timers.
 * 
 * Monitors cmd_vel and LiDAR data timeouts.
 * Stops motors if either watchdog expires.
 */

/**
 * Initialize safety watchdog timers.
 */
void safety_init();

/**
 * Check all safety conditions and take action if needed.
 * Stops motors on cmd_vel timeout or LiDAR data timeout.
 * Should be called at a fixed rate (e.g., 50 Hz).
 */
void safety_check();

/**
 * Notify that a cmd_vel message was received.
 * Resets the cmd_vel watchdog timer.
 */
void safety_notify_cmd_vel();

/**
 * Check if motion commands are allowed.
 * @return true if all safety conditions are met (LiDAR active, no timeout)
 */
bool safety_is_motion_allowed();

#endif // SAFETY_H_
