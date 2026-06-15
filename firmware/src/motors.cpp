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
static const float MAX_LINEAR_SPEED = 0.3f;
static const float MOTOR_SPEED_DEADBAND = 0.01f;
static const float ANGULAR_TURN_DEADBAND = 0.08f;
static const float ANGULAR_FULL_BOOST = 0.8f;
static const int PWM_MIN = 80;
static const int PWM_TURN_MIN = 200;
static const int PWM_IN_PLACE_TURN_MIN = 235;
static const int PWM_MAX = 170;

// ── Spinlock for direction critical section ─────────────────────────────────
#ifndef UNIT_TEST
static portMUX_TYPE motors_mux = portMUX_INITIALIZER_UNLOCKED;
#endif

// ── Motor direction state ───────────────────────────────────────────────────
// 1 = forward, -1 = backward, 0 = stopped
static volatile int left_motor_dir = 0;
static volatile int right_motor_dir = 0;

static int clamp_int(int value, int min_value, int max_value) {
    if (value < min_value) {
        return min_value;
    }

    if (value > max_value) {
        return max_value;
    }

    return value;
}

static int max_int(int left, int right) { return left > right ? left : right; }

static int pwm_from_speed(float speed) {
    int raw = clamp_int((int)(fabsf(speed) * 255.0f / MAX_LINEAR_SPEED), 0, 255);
    return PWM_MIN + raw * (PWM_MAX - PWM_MIN) / 255;
}

static int turn_minimum_pwm(float linear_x, float angular_z) {
    if (fabsf(angular_z) <= ANGULAR_TURN_DEADBAND) {
        return PWM_MIN;
    }

    float turn_ratio = fminf(
        (fabsf(angular_z) - ANGULAR_TURN_DEADBAND) / (ANGULAR_FULL_BOOST - ANGULAR_TURN_DEADBAND),
        1.0f);
    int scaled_min = PWM_TURN_MIN + (int)(turn_ratio * (PWM_IN_PLACE_TURN_MIN - PWM_TURN_MIN));

    if (fabsf(linear_x) <= MOTOR_SPEED_DEADBAND) {
        return max_int(scaled_min, PWM_IN_PLACE_TURN_MIN);
    }

    return scaled_min;
}

static int mixed_wheel_minimum_pwm(float angular_z) {
    if (fabsf(angular_z) <= ANGULAR_TURN_DEADBAND) {
        return PWM_MIN;
    }

    float turn_ratio = fminf(
        (fabsf(angular_z) - ANGULAR_TURN_DEADBAND) / (ANGULAR_FULL_BOOST - ANGULAR_TURN_DEADBAND),
        1.0f);
    return PWM_MIN + (int)(turn_ratio * (PWM_TURN_MIN - PWM_MIN));
}

static int motor_direction(float speed) {
    if (speed > MOTOR_SPEED_DEADBAND) {
        return 1;
    }

    if (speed < -MOTOR_SPEED_DEADBAND) {
        return -1;
    }

    return 0;
}

struct MotorCommand {
    int left_dir;
    int right_dir;
    int left_pwm;
    int right_pwm;
};

static MotorCommand calculate_motor_command(float linear_x, float angular_z) {
    float half_turn_speed = angular_z * WHEEL_SEPARATION / 2.0f;
    float left_speed = linear_x - half_turn_speed;
    float right_speed = linear_x + half_turn_speed;
    int left_dir = motor_direction(left_speed);
    int right_dir = motor_direction(right_speed);
    int left_pwm = left_dir == 0 ? 0 : pwm_from_speed(left_speed);
    int right_pwm = right_dir == 0 ? 0 : pwm_from_speed(right_speed);

    if (left_dir != 0 && right_dir != 0 && fabsf(angular_z) > ANGULAR_TURN_DEADBAND) {
        bool left_is_faster = fabsf(left_speed) > fabsf(right_speed);
        int turn_min_pwm = turn_minimum_pwm(linear_x, angular_z);
        int turn_pwm_delta =
            clamp_int((int)(fabsf(angular_z) * WHEEL_SEPARATION * 255.0f / MAX_LINEAR_SPEED), 0,
                      PWM_MAX - PWM_MIN);

        if (left_is_faster) {
            left_pwm = max_int(left_pwm, turn_min_pwm);
            right_pwm = max_int(right_pwm, clamp_int(left_pwm - turn_pwm_delta,
                                                     mixed_wheel_minimum_pwm(angular_z), PWM_MAX));
        } else {
            right_pwm = max_int(right_pwm, turn_min_pwm);
            left_pwm = max_int(left_pwm, clamp_int(right_pwm - turn_pwm_delta,
                                                   mixed_wheel_minimum_pwm(angular_z), PWM_MAX));
        }
    }

    return {left_dir, right_dir, left_pwm, right_pwm};
}

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
    MotorCommand command = calculate_motor_command(linear_x, angular_z);

#ifndef UNIT_TEST
    portENTER_CRITICAL(&motors_mux);
    left_motor_dir = command.left_dir;
    right_motor_dir = command.right_dir;

    if (command.left_dir == 1) {
        digitalWrite(MOTOR_LEFT_AIN1, HIGH);
        digitalWrite(MOTOR_LEFT_AIN2, LOW);
    } else if (command.left_dir == -1) {
        digitalWrite(MOTOR_LEFT_AIN1, LOW);
        digitalWrite(MOTOR_LEFT_AIN2, HIGH);
    } else {
        digitalWrite(MOTOR_LEFT_AIN1, LOW);
        digitalWrite(MOTOR_LEFT_AIN2, LOW);
    }

    if (command.right_dir == 1) {
        digitalWrite(MOTOR_RIGHT_BIN1, HIGH);
        digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    } else if (command.right_dir == -1) {
        digitalWrite(MOTOR_RIGHT_BIN1, LOW);
        digitalWrite(MOTOR_RIGHT_BIN2, HIGH);
    } else {
        digitalWrite(MOTOR_RIGHT_BIN1, LOW);
        digitalWrite(MOTOR_RIGHT_BIN2, LOW);
    }
    portEXIT_CRITICAL(&motors_mux);

    ledcWrite(LEDC_CH_MOTOR_LEFT, command.left_pwm);
    ledcWrite(LEDC_CH_MOTOR_RIGHT, command.right_pwm);
#else
    left_motor_dir = command.left_dir;
    right_motor_dir = command.right_dir;
#endif
}

int motors_get_left_dir() { return left_motor_dir; }

int motors_get_right_dir() { return right_motor_dir; }
