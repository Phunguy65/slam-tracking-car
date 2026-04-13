/**
 * Motor control module for TB6612FNG driver.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#endif

#include "motors.h"
#include "config.h"

// ── Constants ───────────────────────────────────────────────────────────────
static const float MAX_LINEAR_SPEED = 0.3f;  // m/s for PWM normalization

// ── Spinlock for direction critical section ─────────────────────────────────
#ifndef UNIT_TEST
static portMUX_TYPE motors_mux = portMUX_INITIALIZER_UNLOCKED;
#endif

// ── Motor direction state ───────────────────────────────────────────────────
// 1 = forward, -1 = backward, 0 = stopped
static volatile int left_motor_dir = 0;
static volatile int right_motor_dir = 0;

// ── Public API ──────────────────────────────────────────────────────────────

void motors_init() {
#ifndef UNIT_TEST
    // Direction pins
    pinMode(MOTOR_LEFT_AIN1, OUTPUT);
    pinMode(MOTOR_LEFT_AIN2, OUTPUT);
    pinMode(MOTOR_RIGHT_BIN1, OUTPUT);
    pinMode(MOTOR_RIGHT_BIN2, OUTPUT);

    // PWM channels for speed control
    ledcSetup(LEDC_CH_MOTOR_LEFT, 1000, 8);   // 1 kHz, 8-bit
    ledcSetup(LEDC_CH_MOTOR_RIGHT, 1000, 8);  // 1 kHz, 8-bit
    ledcAttachPin(MOTOR_LEFT_PWMA, LEDC_CH_MOTOR_LEFT);
    ledcAttachPin(MOTOR_RIGHT_PWMB, LEDC_CH_MOTOR_RIGHT);
#endif

    motors_stop();
}

void motors_stop() {
#ifndef UNIT_TEST
    // Set direction BEFORE changing GPIOs, with critical section to prevent ISR
    // from reading stale direction between GPIO change and direction update
    portENTER_CRITICAL(&motors_mux);
    left_motor_dir = 0;
    right_motor_dir = 0;
    digitalWrite(MOTOR_LEFT_AIN1, LOW);
    digitalWrite(MOTOR_LEFT_AIN2, LOW);
    digitalWrite(MOTOR_RIGHT_BIN1, LOW);
    digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    portEXIT_CRITICAL(&motors_mux);
    ledcWrite(LEDC_CH_MOTOR_LEFT, 0);
    ledcWrite(LEDC_CH_MOTOR_RIGHT, 0);
#else
    left_motor_dir = 0;
    right_motor_dir = 0;
#endif
}

void motors_apply_cmd_vel(float linear_x, float angular_z) {
    // Differential drive kinematics
    float left_speed = linear_x - angular_z * WHEEL_SEPARATION / 2.0f;
    float right_speed = linear_x + angular_z * WHEEL_SEPARATION / 2.0f;

#ifndef UNIT_TEST
    // Normalize to PWM range (0-255)
    int left_pwm = constrain((int)(fabsf(left_speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);
    int right_pwm = constrain((int)(fabsf(right_speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);
#endif

    // Determine directions
    int new_left_dir, new_right_dir;
    if (left_speed > 0.01f) {
        new_left_dir = 1;
    } else if (left_speed < -0.01f) {
        new_left_dir = -1;
    } else {
        new_left_dir = 0;
#ifndef UNIT_TEST
        left_pwm = 0;
#endif
    }

    if (right_speed > 0.01f) {
        new_right_dir = 1;
    } else if (right_speed < -0.01f) {
        new_right_dir = -1;
    } else {
        new_right_dir = 0;
#ifndef UNIT_TEST
        right_pwm = 0;
#endif
    }

#ifndef UNIT_TEST
    // Critical section: Set direction variables BEFORE GPIO changes to prevent
    // ISR from reading stale direction between GPIO write and direction update
    portENTER_CRITICAL(&motors_mux);
    left_motor_dir = new_left_dir;
    right_motor_dir = new_right_dir;

    // Left motor direction
    if (new_left_dir == 1) {
        digitalWrite(MOTOR_LEFT_AIN1, HIGH);
        digitalWrite(MOTOR_LEFT_AIN2, LOW);
    } else if (new_left_dir == -1) {
        digitalWrite(MOTOR_LEFT_AIN1, LOW);
        digitalWrite(MOTOR_LEFT_AIN2, HIGH);
    } else {
        digitalWrite(MOTOR_LEFT_AIN1, LOW);
        digitalWrite(MOTOR_LEFT_AIN2, LOW);
    }

    // Right motor direction
    if (new_right_dir == 1) {
        digitalWrite(MOTOR_RIGHT_BIN1, HIGH);
        digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    } else if (new_right_dir == -1) {
        digitalWrite(MOTOR_RIGHT_BIN1, LOW);
        digitalWrite(MOTOR_RIGHT_BIN2, HIGH);
    } else {
        digitalWrite(MOTOR_RIGHT_BIN1, LOW);
        digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    }
    portEXIT_CRITICAL(&motors_mux);

    // Apply PWM (outside critical section — PWM duty doesn't affect direction)
    ledcWrite(LEDC_CH_MOTOR_LEFT, left_pwm);
    ledcWrite(LEDC_CH_MOTOR_RIGHT, right_pwm);
#else
    left_motor_dir = new_left_dir;
    right_motor_dir = new_right_dir;
#endif
}

int motors_get_left_dir() {
    return left_motor_dir;
}

int motors_get_right_dir() {
    return right_motor_dir;
}
