"""
Simulator — Giả lập xe ESP32 để test server mà không cần phần cứng
Chạy: python simulator/vehicle_sim.py
"""
import paho.mqtt.client as mqtt
import json
import time
import math
import random
import threading
import argparse

BROKER = "localhost"
PORT = 1883

def simulate_vehicle(vehicle_id: str, start_lat=10.7769, start_lon=106.7009):
    client = mqtt.Client(client_id=f"sim-{vehicle_id}")
    client.connect(BROKER, PORT)
    client.loop_start()

    # State
    lat, lon = start_lat, start_lon
    speed = 0
    direction = "STOP"
    servo_angle = 90
    heading = 0.0   # degrees

    def on_command(mqttc, userdata, msg):
        nonlocal speed, direction, servo_angle
        try:
            cmd = json.loads(msg.payload)
            c = cmd.get("command", "")
            if c == "MOTOR":
                speed     = cmd.get("speed", 0)
                direction = cmd.get("direction", "STOP")
                print(f"[{vehicle_id}] MOTOR: speed={speed}, dir={direction}")
            elif c == "SERVO":
                servo_angle = cmd.get("angle", 90)
                print(f"[{vehicle_id}] SERVO: angle={servo_angle}")
            elif c in ("STOP", "EMERGENCY_STOP"):
                speed = 0; direction = "STOP"; servo_angle = 90
                print(f"[{vehicle_id}] STOP")
        except Exception as e:
            print(f"CMD error: {e}")

    client.on_message = on_command
    client.subscribe(f"vehicles/{vehicle_id}/commands", qos=2)

    # Publish online
    client.publish(f"vehicles/{vehicle_id}/status", json.dumps({"status": "online"}), qos=1)
    print(f"🚗 Simulator [{vehicle_id}] started at ({lat:.5f}, {lon:.5f})")

    t = 0
    while True:
        t += 0.1

        # Move theo direction và servo
        if direction in ("FORWARD", "BACKWARD"):
            steer = (servo_angle - 90) / 90   # -1 to 1
            heading += steer * 3              # độ/step
            dist = (speed / 100) * 0.00002 * (1 if direction == "FORWARD" else -1)
            lat += dist * math.cos(math.radians(heading))
            lon += dist * math.sin(math.radians(heading))

        # Publish GPS
        client.publish(
            f"vehicles/{vehicle_id}/gps",
            json.dumps({"lat": round(lat, 7), "lon": round(lon, 7), "alt": 5.0, "accuracy": 1.5}),
            qos=0
        )

        # Publish speed
        client.publish(
            f"vehicles/{vehicle_id}/speed",
            json.dumps({"percent": speed, "direction": direction}),
            qos=0
        )

        # Publish LiDAR (giả lập vật cản ngẫu nhiên phía trước)
        distances = {}
        for angle in range(0, 360, 5):
            base_dist = 300.0
            # Thêm noise
            noise = random.uniform(-20, 20)
            # Thỉnh thoảng giả lập vật cản phía trước (0°)
            if angle < 30 or angle > 330:
                if random.random() < 0.02:   # 2% chance obstacle
                    base_dist = random.uniform(20, 50)
            distances[str(angle)] = round(max(5.0, base_dist + noise), 1)

        client.publish(
            f"vehicles/{vehicle_id}/lidar",
            json.dumps({"distances": distances}),
            qos=0
        )

        # Thỉnh thoảng gửi alert
        if random.random() < 0.001:
            client.publish(
                f"vehicles/{vehicle_id}/alerts",
                json.dumps({"level": "WARNING", "message": "Battery low (simulated)"}),
                qos=2
            )

        time.sleep(0.1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", default="vehicle_001", help="Vehicle ID")
    parser.add_argument("--count", type=int, default=1, help="Number of vehicles to simulate")
    args = parser.parse_args()

    threads = []
    for i in range(args.count):
        vid = f"{args.id}" if i == 0 else f"vehicle_{i+1:03d}"
        lat = 10.7769 + i * 0.001
        t = threading.Thread(target=simulate_vehicle, args=(vid, lat, 106.7009), daemon=True)
        t.start()
        threads.append(t)
        time.sleep(0.2)

    print(f"\n✅ {args.count} vehicle(s) simulating. Ctrl+C to stop.\n")
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        print("Simulator stopped.")
