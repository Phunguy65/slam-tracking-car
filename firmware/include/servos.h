#ifndef SERVOS_H_
#define SERVOS_H_

/**
 * Servo module for pan-tilt camera mount.
 * 
 * Uses ESP32Servo library for LEDC PWM control.
 * Position convention: 0 radians = 90 degrees (center).
 */

/**
 * Initialize servo pins and center both axes.
 */
void servos_init();

/**
 * Set pan (horizontal) servo position.
 * @param radians Position in radians (0 = center, negative = left, positive = right)
 */
void servos_set_pan(float radians);

/**
 * Set tilt (vertical) servo position.
 * @param radians Position in radians (0 = center, negative = down, positive = up)
 */
void servos_set_tilt(float radians);

/**
 * Get current pan position in radians.
 */
float servos_get_pan();

/**
 * Get current tilt position in radians.
 */
float servos_get_tilt();

#endif // SERVOS_H_
