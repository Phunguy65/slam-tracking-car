/**
 * Motor control module for TB6612FNG driver.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#endif

#include <math.h>

#include "config.h"
#include "motors.h"

// ── Constants ───────────────────────────────────────────────────────────────
static const float MAX_LINEAR_SPEED = 0.3f;  // m/s for PWM normalization
static const int PWM_MIN = 80;
static const int PWM_IN_PLACE_TURN_MIN = 235;
static const int PWM_MAX = 255;

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

    pinMode(MOTOR_LEFT_AIN1, OUTPUT);
    pinMode(MOTOR_LEFT_AIN2, OUTPUT);
    pinMode(MOTOR_RIGHT_BIN1, OUTPUT);
    pinMode(MOTOR_RIGHT_BIN2, OUTPUT);

    ledcSetup(LEDC_CH_MOTOR_LEFT, 5000, 8);
    ledcSetup(LEDC_CH_MOTOR_RIGHT, 5000, 8);
    ledcAttachPin(MOTOR_LEFT_PWMA, LEDC_CH_MOTOR_LEFT);
    ledcAttachPin(MOTOR_RIGHT_PWMB, LEDC_CH_MOTOR_RIGHT);

#endif

    motors_stop();
}

void motors_stop() {
#ifndef UNIT_TEST

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
    float left_speed = linear_x - angular_z * WHEEL_SEPARATION / 2.0f;
    float right_speed = linear_x + angular_z * WHEEL_SEPARATION / 2.0f;
    bool is_in_place_turn =
        fabsf(linear_x) <= 0.01f && fabsf(left_speed) > 0.01f && fabsf(right_speed) > 0.01f;

#ifndef UNIT_TEST
    int left_raw = constrain((int)(fabsf(left_speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);
    int right_raw = constrain((int)(fabsf(right_speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);
    int left_pwm = PWM_MIN + left_raw * (PWM_MAX - PWM_MIN) / 255;
    int right_pwm = PWM_MIN + right_raw * (PWM_MAX - PWM_MIN) / 255;

    if (is_in_place_turn) {
        left_pwm = max(left_pwm, PWM_IN_PLACE_TURN_MIN);
        right_pwm = max(right_pwm, PWM_IN_PLACE_TURN_MIN);
    }
#endif

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

    portENTER_CRITICAL(&motors_mux);
    left_motor_dir = new_left_dir;
    right_motor_dir = new_right_dir;

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

    ledcWrite(LEDC_CH_MOTOR_LEFT, left_pwm);
    ledcWrite(LEDC_CH_MOTOR_RIGHT, right_pwm);
#else
    left_motor_dir = new_left_dir;
    right_motor_dir = new_right_dir;
#endif
}

int motors_get_left_dir() { return left_motor_dir; }

int motors_get_right_dir() { return right_motor_dir; }
