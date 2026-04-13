#ifndef MOTORS_H_
#define MOTORS_H_

/**
 * Motor control module for TB6612FNG driver.
 * 
 * Handles differential drive motor control including PWM, direction,
 * and direction tracking for encoder ISRs.
 */

/**
 * Initialize motor pins and PWM channels.
 * Sets up TB6612FNG direction pins as outputs and configures LEDC PWM.
 */
void motors_init();

/**
 * Stop both motors immediately.
 * Sets direction to 0 and PWM to 0.
 */
void motors_stop();

/**
 * Apply velocity command using differential drive kinematics.
 * 
 * @param linear_x Linear velocity in m/s (positive = forward)
 * @param angular_z Angular velocity in rad/s (positive = counter-clockwise)
 */
void motors_apply_cmd_vel(float linear_x, float angular_z);

/**
 * Get left motor direction for encoder ISR.
 * @return 1 = forward, -1 = backward, 0 = stopped
 */
int motors_get_left_dir();

/**
 * Get right motor direction for encoder ISR.
 * @return 1 = forward, -1 = backward, 0 = stopped
 */
int motors_get_right_dir();

#endif // MOTORS_H_
