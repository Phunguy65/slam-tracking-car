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
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <std_msgs/msg/int32.h>

#include "config.h"

// ── ESP32-CAM AI-Thinker pin definitions ────────────────────────────────────
#define PWDN_GPIO_NUM    32
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM     0
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27
#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      21
#define Y4_GPIO_NUM      19
#define Y3_GPIO_NUM      18
#define Y2_GPIO_NUM       5
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23
#define PCLK_GPIO_NUM    22

// ── WiFi HTTP server ────────────────────────────────────────────────────────
WiFiServer server(CAM_STREAM_PORT);

// ── micro-ROS entities ──────────────────────────────────────────────────────
rcl_allocator_t allocator;
rclc_support_t support;
rcl_node_t node;
rclc_executor_t executor;
rcl_publisher_t rssi_publisher;
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
        Serial.printf("Camera init failed: 0x%x\n", err);
        return false;
    }
    return true;
}

// ── MJPEG stream handler ────────────────────────────────────────────────────
void handle_stream(WiFiClient &client) {
    String response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
    client.print(response);

    while (client.connected()) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed");
            break;
        }

        String part = "--frame\r\n";
        part += "Content-Type: image/jpeg\r\n";
        part += "Content-Length: " + String(fb->len) + "\r\n\r\n";
        client.print(part);
        client.write(fb->buf, fb->len);
        client.print("\r\n");

        esp_camera_fb_return(fb);

        // Limit frame rate
        delay(100);  // ~10 FPS
    }
}

// ── micro-ROS timer callback (publish WiFi RSSI) ───────────────────────────
void timer_callback(rcl_timer_t *timer, int64_t last_call_time) {
    (void)last_call_time;
    if (timer == NULL) return;

    rssi_msg.data = WiFi.RSSI();
    rcl_publish(&rssi_publisher, &rssi_msg, NULL);
}

// ── Setup ───────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1000);

    // Camera
    if (!init_camera()) {
        Serial.println("Camera init failed, restarting...");
        ESP.restart();
    }
    Serial.println("Camera initialized");

    // WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.printf("\nWiFi connected: %s\n", WiFi.localIP().toString().c_str());

    // HTTP server for MJPEG
    server.begin();
    Serial.printf("MJPEG stream: http://%s:%d/stream\n",
                  WiFi.localIP().toString().c_str(), CAM_STREAM_PORT);

    // micro-ROS
    // Parse AGENT_IP string to IPAddress
    IPAddress agent_ip;
    agent_ip.fromString(AGENT_IP);
    set_microros_wifi_transports(
        (char*)WIFI_SSID, (char*)WIFI_PASSWORD,
        agent_ip, AGENT_PORT
    );

    allocator = rcl_get_default_allocator();
    rclc_support_init(&support, 0, NULL, &allocator);
    rclc_node_init_default(&node, "slam_car_cam", "", &support);

    // RSSI publisher (telemetry)
    rclc_publisher_init_default(
        &rssi_publisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Int32),
        "cam/wifi_rssi"
    );

    // Timer (1 Hz telemetry)
    rclc_timer_init_default(&timer, &support, RCL_MS_TO_NS(1000), timer_callback);

    rclc_executor_init(&executor, &support.context, 1, &allocator);
    rclc_executor_add_timer(&executor, &timer);

    Serial.println("[SLAM Car CAM] micro-ROS node started");
}

// ── Loop ────────────────────────────────────────────────────────────────────
void loop() {
    // Handle MJPEG stream clients
    WiFiClient client = server.available();
    if (client) {
        Serial.println("Stream client connected");
        handle_stream(client);
        Serial.println("Stream client disconnected");
    }

    // Spin micro-ROS
    rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10));
}
