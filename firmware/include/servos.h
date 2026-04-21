#ifndef SERVOS_H_
#define SERVOS_H_

/**
 * Servo module for pan camera mount.
 *
 * Uses ESP32Servo library for LEDC PWM control.
 * Position convention: 0 radians = 90 degrees (center).
 *
 * Note: Tilt servo removed per design decision (pan-only tracking).
 */

/**
 * Initialize servo pin and center the axis.
 */
void servos_init();

/**
 * Set pan (horizontal) servo position.
 * @param radians Position in radians (0 = center, negative = left, positive = right)
 */
void servos_set_pan(float radians);

/**
 * Get current pan position in radians.
 */
float servos_get_pan();

#endif  // SERVOS_H_
