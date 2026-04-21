/**
 * ROS2 diagnostic logger for ESP32 firmware.
 *
 * Dual-output logging: Serial USB and micro-ROS /rosout publisher.
 * Uses static buffers only — no dynamic allocation. String fields of the
 * Log message point at fixed-size static char buffers that are refilled
 * in place on every log call.
 */

#ifndef UNIT_TEST
#include <Arduino.h>
#include <rcl/rcl.h>
#include <rcl_interfaces/msg/log.h>
#endif

#include <stdarg.h>
#include <stdio.h>
#include <string.h>

#include "logger.h"

#define LOG_TAG_BUFFER_SIZE 32
#define LOG_MSG_BUFFER_SIZE 256
#define LOG_LEVEL_INFO 20

#ifndef UNIT_TEST
static rcl_publisher_t* log_publisher_ptr = nullptr;
static rcl_interfaces__msg__Log log_msg;
static char log_tag_buffer[LOG_TAG_BUFFER_SIZE];
static char log_msg_buffer[LOG_MSG_BUFFER_SIZE];
static char format_buffer[LOG_MSG_BUFFER_SIZE];
static bool log_msg_initialized = false;

static void bind_log_message_buffers() {
    log_msg.name.data = log_tag_buffer;
    log_msg.name.capacity = LOG_TAG_BUFFER_SIZE;
    log_msg.name.size = 0;

    log_msg.msg.data = log_msg_buffer;
    log_msg.msg.capacity = LOG_MSG_BUFFER_SIZE;
    log_msg.msg.size = 0;

    log_msg.file.data = nullptr;
    log_msg.file.capacity = 0;
    log_msg.file.size = 0;

    log_msg.function.data = nullptr;
    log_msg.function.capacity = 0;
    log_msg.function.size = 0;

    log_msg.level = LOG_LEVEL_INFO;
    log_msg.stamp.sec = 0;
    log_msg.stamp.nanosec = 0;
    log_msg.line = 0;

    log_msg_initialized = true;
}

/**
 * Copy a NUL-terminated string into a fixed-size static buffer, truncating
 * if necessary and always NUL-terminating. A null source is treated as an
 * empty string so callers do not have to guard every invocation.
 */
static void copy_into_static_string(char* buffer, size_t capacity, size_t* size_out,
                                    const char* source) {
    if (source == nullptr) {
        buffer[0] = '\0';
        *size_out = 0;
        return;
    }
    size_t source_length = strlen(source);
    size_t copy_length = (source_length < capacity - 1) ? source_length : capacity - 1;
    memcpy(buffer, source, copy_length);
    buffer[copy_length] = '\0';
    *size_out = copy_length;
}
#endif

void logger_set_publisher(rcl_publisher_t* publisher) {
#ifndef UNIT_TEST
    if (!log_msg_initialized) {
        bind_log_message_buffers();
    }
    log_publisher_ptr = publisher;
#else
    (void)publisher;
#endif
}

void ros_log(const char* tag, const char* message) {
#ifndef UNIT_TEST
    Serial.printf("[%s] %s\n", tag, message);

    if (log_publisher_ptr != nullptr) {
        if (!log_msg_initialized) {
            bind_log_message_buffers();
        }
        copy_into_static_string(log_tag_buffer, LOG_TAG_BUFFER_SIZE, &log_msg.name.size, tag);
        copy_into_static_string(log_msg_buffer, LOG_MSG_BUFFER_SIZE, &log_msg.msg.size, message);
        rcl_publish(log_publisher_ptr, &log_msg, NULL);
    }
#else
    (void)tag;
    (void)message;
#endif
}

void ros_logf(const char* tag, const char* fmt, ...) {
#ifndef UNIT_TEST
    va_list args;
    va_start(args, fmt);
    vsnprintf(format_buffer, LOG_MSG_BUFFER_SIZE, fmt, args);
    va_end(args);

    ros_log(tag, format_buffer);
#else
    (void)tag;
    (void)fmt;
#endif
}
