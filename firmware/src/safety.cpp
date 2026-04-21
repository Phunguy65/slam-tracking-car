/**
 * Safety module for watchdog timers.
 *
 * Monitors two deadlines on every safety_check():
 *   - cmd_vel watchdog: if no /cmd_vel has arrived within CMD_VEL_TIMEOUT_MS,
 *     motors are stopped (once, latched until the next cmd_vel resets it).
 *   - LiDAR data watchdog: if no LiDAR sample has arrived within
 *     LIDAR_TIMEOUT_MS, motors are stopped and the LiDAR is marked inactive
 *     so that motion is disallowed until data resumes.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#endif

#include "config.h"
#include "lidar.h"
#include "logger.h"
#include "motors.h"
#include "safety.h"

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

    if ((now - last_cmd_vel_time) > CMD_VEL_TIMEOUT_MS) {
        if (!motors_stopped_by_watchdog) {
            motors_stop();
            motors_stopped_by_watchdog = true;
        }
    }

    if (lidar_is_active() && (now - lidar_get_last_data_time()) > LIDAR_TIMEOUT_MS) {
        motors_stop();
        lidar_set_active(false);
        ros_log("SAFETY", "LiDAR data timeout — motors stopped");
    }
#endif
}

void safety_notify_cmd_vel() {
#ifndef UNIT_TEST
    last_cmd_vel_time = millis();
#endif
    motors_stopped_by_watchdog = false;
}

bool safety_is_motion_allowed() { return lidar_is_active(); }
