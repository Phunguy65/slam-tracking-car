"""
MQTT Manager — quản lý kết nối và routing message
"""
import asyncio
import json
import logging
from datetime import datetime
import paho.mqtt.client as mqtt
from core.config import settings
from core.vehicle_state import get_vehicle, DriveMode, AlertLevel

logger = logging.getLogger(__name__)


class MQTTManager:
    def __init__(self):
        self.client = mqtt.Client(
            client_id=settings.MQTT_CLIENT_ID,
            clean_session=False
        )
        self._setup_callbacks()
        self._handlers = {}   # topic_pattern -> handler func
        self._register_handlers()

    def _setup_callbacks(self):
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

        if settings.MQTT_USERNAME:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        # Last Will: nếu server chết, báo xe biết
        self.client.will_set(
            "system/server/status",
            json.dumps({"status": "offline", "time": datetime.now().isoformat()}),
            qos=1, retain=True
        )

    def _register_handlers(self):
        """Đăng ký handler cho từng loại topic"""
        self._handlers = {
            "gps":      self._handle_gps,
            "lidar":    self._handle_lidar,
            "speed":    self._handle_speed,
            "status":   self._handle_status,
            "alerts":   self._handle_alerts,
        }

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("✅ Connected to MQTT Broker")
            # Subscribe tất cả data từ xe
            client.subscribe("vehicles/+/gps",    qos=0)
            client.subscribe("vehicles/+/lidar",  qos=0)
            client.subscribe("vehicles/+/speed",  qos=0)
            client.subscribe("vehicles/+/status", qos=1)
            client.subscribe("vehicles/+/alerts", qos=2)

            # Publish server online
            client.publish(
                "system/server/status",
                json.dumps({"status": "online", "time": datetime.now().isoformat()}),
                qos=1, retain=True
            )
        else:
            logger.error(f"❌ MQTT Connection failed rc={rc}")

    def _on_disconnect(self, client, userdata, rc):
        logger.warning(f"⚠️  MQTT Disconnected rc={rc}")

    def _on_message(self, client, userdata, msg):
        try:
            parts = msg.topic.split("/")
            # Expected: vehicles/{vehicle_id}/{data_type}
            if len(parts) < 3 or parts[0] != "vehicles":
                return

            vehicle_id = parts[1]
            data_type = parts[2]
            payload = json.loads(msg.payload.decode())

            vehicle = get_vehicle(vehicle_id)
            vehicle.last_seen = datetime.now()
            vehicle.connected = True

            handler = self._handlers.get(data_type)
            if handler:
                handler(vehicle, payload)

        except Exception as e:
            logger.error(f"Error processing message {msg.topic}: {e}")

    # ── Handlers ──────────────────────────────────────────────

    def _handle_gps(self, vehicle, payload):
        vehicle.gps.lat = payload.get("lat", 0)
        vehicle.gps.lon = payload.get("lon", 0)
        vehicle.gps.altitude = payload.get("alt", 0)
        vehicle.gps.accuracy_m = payload.get("accuracy", 0)

    def _handle_lidar(self, vehicle, payload):
        """
        payload = {
            "distances": {"0": 120.5, "45": 80.0, ...},  # angle(str) -> cm
        }
        """
        distances = {float(k): float(v) for k, v in payload.get("distances", {}).items()}
        if not distances:
            return

        min_angle = min(distances, key=distances.get)
        min_dist = distances[min_angle]

        vehicle.lidar.distances = distances
        vehicle.lidar.min_distance_cm = min_dist
        vehicle.lidar.min_distance_angle = min_angle
        vehicle.lidar.timestamp = datetime.now()

        # Kiểm tra vật cản
        if min_dist < settings.LIDAR_OBSTACLE_THRESHOLD_CM:
            if not vehicle.obstacle_detected:
                vehicle.obstacle_detected = True
                vehicle.add_alert(AlertLevel.CRITICAL, f"Obstacle at {min_dist:.1f}cm (angle {min_angle}°)")
                logger.warning(f"🚨 [{vehicle.vehicle_id}] Obstacle {min_dist:.1f}cm")

                # Nếu đang autopilot/waypoint → dừng khẩn cấp
                if vehicle.mode in (DriveMode.AUTOPILOT, DriveMode.WAYPOINT, DriveMode.HYBRID):
                    self.send_command(vehicle.vehicle_id, {"command": "STOP"})
        else:
            vehicle.obstacle_detected = False

    def _handle_speed(self, vehicle, payload):
        vehicle.motor.speed_percent = payload.get("percent", 0)
        vehicle.motor.direction = payload.get("direction", "STOP")

    def _handle_status(self, vehicle, payload):
        status = payload.get("status", "unknown")
        if status == "offline":
            vehicle.connected = False
            logger.info(f"🔴 [{vehicle.vehicle_id}] went offline")
        elif status == "online":
            logger.info(f"🟢 [{vehicle.vehicle_id}] online")

    def _handle_alerts(self, vehicle, payload):
        level_str = payload.get("level", "INFO")
        message = payload.get("message", "")
        try:
            level = AlertLevel(level_str)
        except ValueError:
            level = AlertLevel.INFO
        vehicle.add_alert(level, message)
        logger.warning(f"[{vehicle.vehicle_id}] Alert [{level_str}]: {message}")

    # ── Publish helpers ────────────────────────────────────────

    def send_command(self, vehicle_id: str, command: dict, qos: int = 2):
        """Gửi lệnh điều khiển tới xe — QoS 2 mặc định"""
        topic = f"vehicles/{vehicle_id}/commands"
        payload = json.dumps(command)
        result = self.client.publish(topic, payload, qos=qos)
        logger.info(f"📤 CMD → [{vehicle_id}] {command}")
        return result

    def send_motor(self, vehicle_id: str, speed: int, direction: str):
        return self.send_command(vehicle_id, {
            "command": "MOTOR",
            "speed": max(0, min(100, speed)),
            "direction": direction,
        })

    def send_servo(self, vehicle_id: str, angle: int):
        return self.send_command(vehicle_id, {
            "command": "SERVO",
            "angle": max(0, min(180, angle)),
        })

    def send_mode(self, vehicle_id: str, mode: str):
        return self.send_command(vehicle_id, {"command": "SET_MODE", "mode": mode})

    # ── Lifecycle ─────────────────────────────────────────────

    async def start(self):
        self.client.connect_async(settings.MQTT_BROKER, settings.MQTT_PORT, settings.MQTT_KEEPALIVE)
        self.client.loop_start()
        logger.info(f"🔌 MQTT connecting to {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
        await asyncio.sleep(1.5)

    async def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("MQTT disconnected.")


# Singleton accessible toàn app
_mqtt_manager: MQTTManager | None = None


def get_mqtt() -> MQTTManager:
    global _mqtt_manager
    if _mqtt_manager is None:
        _mqtt_manager = MQTTManager()
    return _mqtt_manager
