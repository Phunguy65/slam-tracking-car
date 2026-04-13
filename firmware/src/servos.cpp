/**
 * Servo module for pan-tilt camera mount.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <ESP32Servo.h>
#endif

#include "servos.h"
#include "config.h"

#include <math.h>

// ── Servo instances ─────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static Servo servo_pan;
static Servo servo_tilt;
#endif

// ── Servo position state (radians) ──────────────────────────────────────────
static float servo_pan_rad = 0.0f;
static float servo_tilt_rad = 0.0f;

// ── Public API ──────────────────────────────────────────────────────────────

void servos_init() {
#ifndef UNIT_TEST
    // ESP32Servo handles LEDC channel allocation internally
    // Use 3-arg attach: pin, min_pulse_us, max_pulse_us
    servo_pan.attach(SERVO_PAN_PIN, 500, 2400);
    servo_tilt.attach(SERVO_TILT_PIN, 500, 2400);

    // Center both servos on startup
    servo_pan.write(SERVO_CENTER);
    servo_tilt.write(SERVO_CENTER);
#endif

    // 90 degrees = 0 radians in our convention (center)
    servo_pan_rad = 0.0f;
    servo_tilt_rad = 0.0f;
}

void servos_set_pan(float radians) {
    servo_pan_rad = radians;

#ifndef UNIT_TEST
    // Convert radians to degrees: 0 rad = 90° (center), range maps to 0-180°
    int deg = constrain((int)(radians * 180.0f / PI + 90.0f), 0, 180);
    servo_pan.write(deg);
#endif
}

void servos_set_tilt(float radians) {
    servo_tilt_rad = radians;

#ifndef UNIT_TEST
    // Convert radians to degrees: 0 rad = 90° (center), range maps to 0-180°
    int deg = constrain((int)(radians * 180.0f / PI + 90.0f), 0, 180);
    servo_tilt.write(deg);
#endif
}

float servos_get_pan() {
    return servo_pan_rad;
}

float servos_get_tilt() {
    return servo_tilt_rad;
}
