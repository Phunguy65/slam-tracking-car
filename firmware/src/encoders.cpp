/**
 * Wheel encoder module with odometry computation.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#endif

#include "encoders.h"
#include "motors.h"
#include "config.h"

#include <math.h>

// ── Constants ───────────────────────────────────────────────────────────────
static const float TICKS_TO_METERS = (2.0f * PI * WHEEL_RADIUS) / (float)ENCODER_PPR;

// ── Spinlock for encoder critical section ───────────────────────────────────
#ifndef UNIT_TEST
static portMUX_TYPE encoders_mux = portMUX_INITIALIZER_UNLOCKED;
#endif

// ── Encoder tick counters ───────────────────────────────────────────────────
static volatile long encoder_left_ticks = 0;
static volatile long encoder_right_ticks = 0;

// ── Odometry state ──────────────────────────────────────────────────────────
static float odom_x = 0.0f;
static float odom_y = 0.0f;
static float odom_theta = 0.0f;
static float odom_linear_vel = 0.0f;
static float odom_angular_vel = 0.0f;

#ifndef UNIT_TEST
static unsigned long last_odom_time = 0;
#endif

// ── Encoder ISRs ────────────────────────────────────────────────────────────
#ifndef UNIT_TEST
void IRAM_ATTR encoder_left_isr() {
    encoder_left_ticks += motors_get_left_dir();
}

void IRAM_ATTR encoder_right_isr() {
    encoder_right_ticks += motors_get_right_dir();
}
#endif

// ── Public API ──────────────────────────────────────────────────────────────

void encoders_init() {
#ifndef UNIT_TEST
    pinMode(ENCODER_LEFT_PIN, INPUT_PULLUP);
    pinMode(ENCODER_RIGHT_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(ENCODER_LEFT_PIN), encoder_left_isr, RISING);
    attachInterrupt(digitalPinToInterrupt(ENCODER_RIGHT_PIN), encoder_right_isr, RISING);
    last_odom_time = millis();
#endif
}

void encoders_update_odometry() {
#ifndef UNIT_TEST
    unsigned long now = millis();
    float dt = (float)(now - last_odom_time) / 1000.0f;
    last_odom_time = now;

    if (dt <= 0.0f || dt > 1.0f) return;  // Guard against bad timing

    // Read and reset tick counters (critical section — disables interrupts on this core)
    portENTER_CRITICAL(&encoders_mux);
    long left_ticks = encoder_left_ticks;
    long right_ticks = encoder_right_ticks;
    encoder_left_ticks = 0;
    encoder_right_ticks = 0;
    portEXIT_CRITICAL(&encoders_mux);
#else
    // For unit tests: use fixed dt and accumulated ticks
    float dt = 0.02f;  // 50 Hz
    long left_ticks = encoder_left_ticks;
    long right_ticks = encoder_right_ticks;
    encoder_left_ticks = 0;
    encoder_right_ticks = 0;
#endif

    // Convert ticks to distance
    float delta_left = (float)left_ticks * TICKS_TO_METERS;
    float delta_right = (float)right_ticks * TICKS_TO_METERS;

    // Differential drive kinematics
    float delta_s = (delta_left + delta_right) / 2.0f;
    float delta_theta = (delta_right - delta_left) / WHEEL_SEPARATION;

    // Update pose
    odom_x += delta_s * cosf(odom_theta + delta_theta / 2.0f);
    odom_y += delta_s * sinf(odom_theta + delta_theta / 2.0f);
    odom_theta += delta_theta;

    // Normalize theta to [-PI, PI]
    while (odom_theta > PI) odom_theta -= 2.0f * PI;
    while (odom_theta < -PI) odom_theta += 2.0f * PI;

    // Compute velocities
    odom_linear_vel = delta_s / dt;
    odom_angular_vel = delta_theta / dt;
}

float encoders_get_x() {
    return odom_x;
}

float encoders_get_y() {
    return odom_y;
}

float encoders_get_theta() {
    return odom_theta;
}

float encoders_get_linear_vel() {
    return odom_linear_vel;
}

float encoders_get_angular_vel() {
    return odom_angular_vel;
}
