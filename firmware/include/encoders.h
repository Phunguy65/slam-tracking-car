#ifndef ENCODERS_H_
#define ENCODERS_H_

/**
 * Wheel encoder module with odometry computation.
 * 
 * Handles encoder ISRs, tick counting, and differential drive odometry.
 * ISRs use motors_get_*_dir() to determine tick sign.
 */

/**
 * Initialize encoder pins and attach interrupts.
 */
void encoders_init();

/**
 * Update odometry based on accumulated encoder ticks.
 * Computes pose (x, y, theta) and velocities using differential drive kinematics.
 * Should be called at a fixed rate (e.g., 50 Hz).
 */
void encoders_update_odometry();

/**
 * Get current X position in meters.
 */
float encoders_get_x();

/**
 * Get current Y position in meters.
 */
float encoders_get_y();

/**
 * Get current heading in radians (-PI to PI).
 */
float encoders_get_theta();

/**
 * Get current linear velocity in m/s.
 */
float encoders_get_linear_vel();

/**
 * Get current angular velocity in rad/s.
 */
float encoders_get_angular_vel();

#endif // ENCODERS_H_
