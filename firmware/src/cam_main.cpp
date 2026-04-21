/**
 * SLAM Tracking Car — ESP32-CAM Firmware
 *
 * Provides:
 *   - MJPEG HTTP stream on port 80 (consumed by cam_bridge_node)
 *   - micro-ROS telemetry (optional: battery, WiFi RSSI)
 *
 * Build: pio run -e esp32_cam -t upload
 */
#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <micro_ros_platformio.h>
#include <rcl/rcl.h>
#include <rcl_interfaces/msg/log.h>
#include <rclc/executor.h>
#include <rclc/rclc.h>
#include <std_msgs/msg/int32.h>

#include "config.h"
#include "logger.h"

// ── ESP32-CAM AI-Thinker pin definitions ────────────────────────────────────
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

// ── Frame rate limit for the MJPEG stream ──────────────────────────────────
static const uint32_t STREAM_FRAME_INTERVAL_MS = 100;

// ── WiFi HTTP server ────────────────────────────────────────────────────────
WiFiServer server(CAM_STREAM_PORT);

// ── micro-ROS entities ──────────────────────────────────────────────────────
rcl_allocator_t allocator;
rclc_support_t support;
rcl_node_t node;
rclc_executor_t executor;
rcl_publisher_t rssi_publisher;
rcl_publisher_t log_publisher;
std_msgs__msg__Int32 rssi_msg;
rcl_timer_t timer;

// ── Camera init ─────────────────────────────────────────────────────────────
bool init_camera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    if (psramFound()) {
        config.frame_size = CAM_FRAME_SIZE;
        config.jpeg_quality = CAM_JPEG_QUALITY;
        config.fb_count = CAM_FB_COUNT;
    } else {
        config.frame_size = FRAMESIZE_QVGA;
        config.jpeg_quality = 15;
        config.fb_count = 1;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        ros_logf("CAM", "Camera init failed: 0x%x", err);
        return false;
    }
    return true;
}

// ── MJPEG stream handler ────────────────────────────────────────────────────
void handle_stream(WiFiClient& client) {
    String response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
    client.print(response);

    while (client.connected()) {
        camera_fb_t* fb = esp_camera_fb_get();
        if (!fb) {
            ros_log("CAM", "Camera capture failed");
            break;
        }

        String part = "--frame\r\n";
        part += "Content-Type: image/jpeg\r\n";
        part += "Content-Length: " + String(fb->len) + "\r\n\r\n";
        client.print(part);
        client.write(fb->buf, fb->len);
        client.print("\r\n");

        esp_camera_fb_return(fb);

        delay(STREAM_FRAME_INTERVAL_MS);
    }
}

// ── micro-ROS timer callback (publish WiFi RSSI) ───────────────────────────
void timer_callback(rcl_timer_t* timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    rssi_msg.data = WiFi.RSSI();
    rcl_publish(&rssi_publisher, &rssi_msg, NULL);
}

#define RCCHECK(fn)                    \
    {                                  \
        rcl_ret_t temp_rc = fn;        \
        if ((temp_rc != RCL_RET_OK)) { \
            error_loop();              \
        }                              \
    }

void error_loop() {
    while (1) {
        delay(100);
    }
}

// ── Setup ───────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1000);

    if (!init_camera()) {
        ros_log("CAM", "Camera init failed, restarting...");
        ESP.restart();
    }
    ros_log("CAM", "Camera initialized");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    ros_logf("CAM", "WiFi connected: %s", WiFi.localIP().toString().c_str());

    server.begin();
    ros_logf("CAM", "MJPEG stream: http://%s:%d/stream", WiFi.localIP().toString().c_str(),
             CAM_STREAM_PORT);

    IPAddress agent_ip;
    agent_ip.fromString(AGENT_IP);
    set_microros_wifi_transports((char*)WIFI_SSID, (char*)WIFI_PASSWORD, agent_ip, AGENT_PORT);

    allocator = rcl_get_default_allocator();

    while (rmw_uros_ping_agent(1000, 1) != RCL_RET_OK) {
        ros_log("CAM", "Waiting for micro-ROS agent...");
        delay(500);
    }

    RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));

    RCCHECK(rclc_node_init_default(&node, "slam_car_cam", "", &support));

    RCCHECK(rclc_publisher_init_default(&rssi_publisher, &node,
                                        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Int32),
                                        "cam/wifi_rssi"));

    rcl_ret_t log_ret = rclc_publisher_init_best_effort(
        &log_publisher, &node, ROSIDL_GET_MSG_TYPE_SUPPORT(rcl_interfaces, msg, Log), "rosout");
    if (log_ret == RCL_RET_OK) {
        logger_set_publisher(&log_publisher);
    }

    RCCHECK(rclc_timer_init_default(&timer, &support, RCL_MS_TO_NS(1000), timer_callback));

    rclc_executor_init(&executor, &support.context, 1, &allocator);
    rclc_executor_add_timer(&executor, &timer);

    ros_log("SLAM Car CAM", "micro-ROS node started");
}

void loop() {
    WiFiClient client = server.available();
    if (client) {
        ros_log("CAM", "Stream client connected");
        handle_stream(client);
        ros_log("CAM", "Stream client disconnected");
    }

    rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10));
}
