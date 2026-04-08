"""
ESP32 Firmware (MicroPython)
Upload file này lên ESP32 bằng Thonny hoặc mpremote

Phần cứng:
- Motor L298N/L293D: IN1=GPIO12, IN2=GPIO13, ENA=GPIO14 (PWM)
                     IN3=GPIO26, IN4=GPIO27, ENB=GPIO25 (PWM)
- Servo:            SIGNAL=GPIO18
- LiDAR UART:       TX=GPIO17, RX=GPIO16 (UART2)
- WiFi + MQTT via umqtt.simple
"""
import network
import time
import json
import machine
from machine import Pin, PWM, UART
from umqtt.simple import MQTTClient

# ── Config ─────────────────────────────────────────────────────
WIFI_SSID     = "YOUR_WIFI"
WIFI_PASSWORD = "YOUR_PASSWORD"
MQTT_BROKER   = "192.168.1.x"   # IP máy chạy server
MQTT_PORT     = 1883
VEHICLE_ID    = "vehicle_001"

# ── Hardware pins ──────────────────────────────────────────────
# Motor A (trái)
IN1   = Pin(12, Pin.OUT)
IN2   = Pin(13, Pin.OUT)
ENA   = PWM(Pin(14), freq=1000)

# Motor B (phải)
IN3   = Pin(26, Pin.OUT)
IN4   = Pin(27, Pin.OUT)
ENB   = PWM(Pin(25), freq=1000)

# Servo
SERVO_PIN = PWM(Pin(18), freq=50)

# LiDAR UART (RPLIDAR or YDLiDAR)
lidar_uart = UART(2, baudrate=115200, tx=17, rx=16)


# ── WiFi ───────────────────────────────────────────────────────
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    for _ in range(20):
        if wlan.isconnected():
            print("WiFi OK:", wlan.ifconfig())
            return True
        time.sleep(0.5)
    print("WiFi FAILED")
    return False


# ── Motor control ───────────────────────────────────────────────
def set_motor(speed_pct: int, direction: str):
    """
    speed_pct: 0-100
    direction: FORWARD / BACKWARD / STOP
    """
    duty = int(speed_pct / 100 * 1023)
    if direction == "FORWARD":
        IN1.value(1); IN2.value(0)
        IN3.value(1); IN4.value(0)
        ENA.duty(duty); ENB.duty(duty)
    elif direction == "BACKWARD":
        IN1.value(0); IN2.value(1)
        IN3.value(0); IN4.value(1)
        ENA.duty(duty); ENB.duty(duty)
    else:  # STOP
        IN1.value(0); IN2.value(0)
        IN3.value(0); IN4.value(0)
        ENA.duty(0);  ENB.duty(0)


def set_motor_differential(left_pct: int, right_pct: int):
    """Điều khiển riêng từng bánh để quẹo mượt hơn"""
    left_duty  = int(left_pct  / 100 * 1023)
    right_duty = int(right_pct / 100 * 1023)
    IN1.value(1); IN2.value(0); ENA.duty(left_duty)
    IN3.value(1); IN4.value(0); ENB.duty(right_duty)


# ── Servo ───────────────────────────────────────────────────────
def set_servo(angle: int):
    """
    angle: 0-180
    Pulse: 0.5ms (0°) → 2.5ms (180°) @ 50Hz → duty 26-128
    """
    angle = max(0, min(180, angle))
    duty = int(26 + (angle / 180) * 102)
    SERVO_PIN.duty(duty)


# ── LiDAR reader ───────────────────────────────────────────────
def read_lidar_simple():
    """
    Đọc dữ liệu LiDAR thô từ UART.
    Đây là placeholder — format packet tùy LiDAR model.
    RPLIDAR A1: packet 5 bytes, YDLiDAR: khác
    """
    distances = {}
    if lidar_uart.any():
        raw = lidar_uart.read(256)
        # TODO: parse theo protocol của LiDAR model bạn dùng
        # Ví dụ đơn giản — giả lập 8 hướng
        for i, angle in enumerate(range(0, 360, 45)):
            distances[str(angle)] = 200.0  # placeholder cm
    return distances


# ── MQTT ────────────────────────────────────────────────────────
client = None

def on_command(topic, msg):
    """Nhận lệnh từ server"""
    try:
        cmd = json.loads(msg)
        command = cmd.get("command", "")

        if command == "MOTOR":
            set_motor(cmd.get("speed", 0), cmd.get("direction", "STOP"))

        elif command == "SERVO":
            set_servo(cmd.get("angle", 90))

        elif command == "STOP":
            set_motor(0, "STOP")
            set_servo(90)

        elif command == "SET_MODE":
            print("Mode changed to:", cmd.get("mode"))

        print("CMD:", cmd)
    except Exception as e:
        print("CMD error:", e)


def connect_mqtt():
    global client
    client = MQTTClient(
        client_id=VEHICLE_ID,
        server=MQTT_BROKER,
        port=MQTT_PORT,
        keepalive=30
    )
    # Last Will — báo server khi mất kết nối
    client.set_last_will(
        topic=f"vehicles/{VEHICLE_ID}/status",
        msg=json.dumps({"status": "offline"}),
        qos=1
    )
    client.set_callback(on_command)
    client.connect()
    client.subscribe(f"vehicles/{VEHICLE_ID}/commands", qos=2)
    print("MQTT connected!")

    # Thông báo online
    client.publish(
        f"vehicles/{VEHICLE_ID}/status",
        json.dumps({"status": "online"}),
        qos=1
    )


# ── Main loop ───────────────────────────────────────────────────
def main():
    connect_wifi()
    connect_mqtt()
    set_servo(90)   # Servo về thẳng

    publish_counter = 0

    while True:
        try:
            # Check lệnh từ server (non-blocking)
            client.check_msg()

            # Publish sensor data mỗi 500ms
            if publish_counter % 5 == 0:
                # LiDAR
                distances = read_lidar_simple()
                if distances:
                    client.publish(
                        f"vehicles/{VEHICLE_ID}/lidar",
                        json.dumps({"distances": distances}),
                        qos=0
                    )

                # GPS (nếu có GPS module, đọc từ UART khác)
                # client.publish(f"vehicles/{VEHICLE_ID}/gps", json.dumps({"lat":..., "lon":...}))

            publish_counter += 1
            time.sleep_ms(100)

        except OSError as e:
            print("MQTT error, reconnecting...", e)
            time.sleep(2)
            try:
                connect_mqtt()
            except Exception:
                pass


main()
