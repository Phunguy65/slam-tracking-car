/**
 * Safety module for watchdog timers.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#endif

#include "safety.h"
#include "motors.h"
#include "lidar.h"
#include "config.h"

// ── Safety state ────────────────────────────────────────────────────────────
static unsigned long last_cmd_vel_time = 0;
static bool motors_stopped_by_watchdog = false;

// ── Public API ──────────────────────────────────────────────────────────────

void safety_init() {
#ifndef UNIT_TEST
    last_cmd_vel_time = millis();
#endif
    motors_stopped_by_watchdog = false;
}

void safety_check() {
#ifndef UNIT_TEST
    unsigned long now = millis();

    // cmd_vel watchdog (1 second timeout)
    if ((now - last_cmd_vel_time) > CMD_VEL_TIMEOUT_MS) {
        if (!motors_stopped_by_watchdog) {
            motors_stop();
            motors_stopped_by_watchdog = true;
        }
    }

    // LiDAR data watchdog (2 second timeout)
    if (lidar_is_active() && (now - lidar_get_last_data_time()) > LIDAR_TIMEOUT_MS) {
        motors_stop();
        lidar_set_active(false);
        Serial.println("[SAFETY] LiDAR data timeout — motors stopped");
    }
#endif
}

void safety_notify_cmd_vel() {
#ifndef UNIT_TEST
    last_cmd_vel_time = millis();
#endif
    motors_stopped_by_watchdog = false;
}

bool safety_is_motion_allowed() {
    // Motion is allowed only if LiDAR is active
    return lidar_is_active();
}
