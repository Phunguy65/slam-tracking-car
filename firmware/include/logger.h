#ifndef LOGGER_H_
#define LOGGER_H_

/**
 * ROS2 diagnostic logger for ESP32 firmware.
 *
 * Provides dual-output logging: Serial USB and micro-ROS /rosout publisher.
 * Before micro-ROS is initialized, logs are printed to Serial only (graceful
 * degradation). Once a publisher is registered via logger_set_publisher(),
 * every log is also published as rcl_interfaces/msg/Log.
 *
 * All buffers are statically allocated — no heap usage.
 *
 * Thread safety: NOT reentrant. Shared static buffers are refilled in place
 * on every call. Intended for use from a single micro-ROS executor thread;
 * do not call from ISRs or concurrent FreeRTOS tasks without external locking.
 */

#ifndef UNIT_TEST
#include <rcl/rcl.h>
#else
typedef struct rcl_publisher_s rcl_publisher_t;
#endif

/**
 * Register the micro-ROS publisher for /rosout.
 * Must be called after the publisher is initialized in ros_bridge.
 * Pass NULL to disable ROS publishing (Serial-only mode).
 *
 * @param publisher Pointer to an initialized rcl_publisher_t for Log messages
 */
void logger_set_publisher(rcl_publisher_t* publisher);

/**
 * Log a message with a tag prefix.
 * Outputs to Serial as "[tag] message" and publishes to /rosout if available.
 *
 * @param tag  Short identifier for the subsystem (e.g. "LiDAR", "IMU")
 * @param message  The log message string
 */
void ros_log(const char* tag, const char* message);

/**
 * Log a formatted message with a tag prefix (printf-style).
 * Outputs to Serial as "[tag] formatted message" and publishes to /rosout
 * if available.
 *
 * @param tag  Short identifier for the subsystem (e.g. "LiDAR", "IMU")
 * @param fmt  printf-style format string
 * @param ...  Format arguments
 */
void ros_logf(const char* tag, const char* fmt, ...);

#endif  // LOGGER_H_
