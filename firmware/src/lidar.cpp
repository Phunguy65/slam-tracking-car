/**
 * LiDAR module for LDS02RR via kaiaai/LDS library.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <lds_all_models.h>
#endif

#include <math.h>

#include "config.h"
#include "lidar.h"
#include "logger.h"

// ── LiDAR hardware ──────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static HardwareSerial LidarSerial(LIDAR_UART_NUM);
static LDS_LDS02RR lidar;
#endif

// ── Scan buffer and state ───────────────────────────────────────────────────
static float scan_ranges[SCAN_POINTS];
static volatile bool scan_ready_flag = false;
static unsigned long last_data_time = 0;
static bool lidar_active_flag = true;

// ── LiDAR callbacks (forward declarations) ──────────────────────────────────
#ifndef UNIT_TEST
static void lidar_scan_point_cb(float angle_deg, float distance_mm, float quality,
                                bool scan_completed);
static void lidar_motor_pin_cb(float value, LDS::lds_pin_t pin);
static int lidar_serial_read_cb();
static size_t lidar_serial_write_cb(const uint8_t* buffer, size_t length);
#endif

// ── Public API ──────────────────────────────────────────────────────────────

void lidar_init() {
#ifndef UNIT_TEST
    LidarSerial.begin(LIDAR_BAUD, SERIAL_8N1, LIDAR_RX_PIN, LIDAR_TX_PIN);

    lidar.setScanPointCallback(lidar_scan_point_cb);
    lidar.setMotorPinCallback(lidar_motor_pin_cb);
    lidar.setSerialReadCallback(lidar_serial_read_cb);
    lidar.setSerialWriteCallback(lidar_serial_write_cb);

    lidar.init();

    LDS::result_t result = lidar.start();
    if (result == LDS::RESULT_OK) {
        lidar.setScanTargetFreqHz(5.0f);
        ros_log("LiDAR", "LDS02RR started, target 5 Hz");
    } else {
        ros_logf("LiDAR", "Start failed: %s", lidar.resultCodeToString(result));
    }

    last_data_time = millis();
#endif

    for (int i = 0; i < SCAN_POINTS; i++) {
        scan_ranges[i] = INFINITY;
    }
}

void lidar_loop() {
#ifndef UNIT_TEST
    lidar.loop();
#endif
}

bool lidar_is_active() { return lidar_active_flag; }

bool lidar_is_scan_ready() { return scan_ready_flag; }

const float* lidar_get_ranges() { return scan_ranges; }

void lidar_clear_scan_ready() { scan_ready_flag = false; }

void lidar_notify_data() {
#ifndef UNIT_TEST
    last_data_time = millis();
#endif

    if (!lidar_active_flag) {
        lidar_active_flag = true;
#ifndef UNIT_TEST
        ros_log("LiDAR", "Data resumed");
#endif
    }
}

/**
 * Return the millis() timestamp of the last LiDAR data sample.
 * The safety module uses this to detect data timeouts and stop motors;
 * the LiDAR module itself does not act on the value.
 */
unsigned long lidar_get_last_data_time() { return last_data_time; }

void lidar_set_active(bool active) { lidar_active_flag = active; }

// ── LiDAR callbacks ─────────────────────────────────────────────────────────
#ifndef UNIT_TEST
static void lidar_scan_point_cb(float angle_deg, float distance_mm, float quality,
                                bool scan_completed) {
    lidar_notify_data();

    if (scan_completed) {
        scan_ready_flag = true;
        for (int i = 0; i < SCAN_POINTS; i++) scan_ranges[i] = INFINITY;
        return;
    }

    int idx = constrain((int)angle_deg, 0, SCAN_POINTS - 1);

    const float MIN_RANGE_M = 0.13f;
    const float MAX_RANGE_M = 8.0f;
    if (distance_mm > 0.0f) {
        float dist_m = distance_mm / 1000.0f;
        if (dist_m >= MIN_RANGE_M && dist_m <= MAX_RANGE_M) {
            scan_ranges[idx] = dist_m;
        } else {
            scan_ranges[idx] = INFINITY;
        }
    } else {
        scan_ranges[idx] = INFINITY;
    }
}

/**
 * Motor pin callback from the LDS driver.
 *
 * LDS02RR uses a single PWM pin for motor control, so we only act on
 * LDS_MOTOR_PWM_PIN and ignore callbacks for any other pin type to prevent
 * the driver from poking the wrong GPIO.
 *
 * LEDC is configured lazily on the first PWM-direction callback and never
 * re-initialised; re-running ledcSetup on an active channel causes motor
 * stutter on the LDS02RR.
 */
static void lidar_motor_pin_cb(float value, LDS::lds_pin_t pin) {
    if (pin != LDS::LDS_MOTOR_PWM_PIN) return;

    const int gpio = LIDAR_MOTOR_PIN;
    const uint32_t LEDC_FREQ_HZ = 25000;
    const uint8_t LEDC_RESOLUTION_BITS = 8;
    const float PWM_MAX_8BIT = 255.0f;
    static bool ledc_initialized = false;

    if (value <= (float)LDS::DIR_INPUT) {
        if (value == (float)LDS::DIR_OUTPUT_PWM) {
            if (!ledc_initialized) {
                ledcSetup(LEDC_CH_LIDAR_MOTOR, LEDC_FREQ_HZ, LEDC_RESOLUTION_BITS);
                ledcAttachPin(gpio, LEDC_CH_LIDAR_MOTOR);
                ledc_initialized = true;
            }
        } else {
            pinMode(gpio, (value == (float)LDS::DIR_INPUT) ? INPUT : OUTPUT);
        }
    } else if (value < (float)LDS::VALUE_PWM) {
        digitalWrite(gpio, (value == (float)LDS::VALUE_HIGH) ? HIGH : LOW);
    } else {
        int pwm_val = (int)(value * PWM_MAX_8BIT);
        ledcWrite(LEDC_CH_LIDAR_MOTOR, pwm_val);
    }
}

static int lidar_serial_read_cb() { return LidarSerial.read(); }

static size_t lidar_serial_write_cb(const uint8_t* buffer, size_t length) {
    return LidarSerial.write(buffer, length);
}
#endif
