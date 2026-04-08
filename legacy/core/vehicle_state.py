"""
VehicleState — trung tâm lưu trạng thái toàn bộ xe
Được chia sẻ giữa MQTT, AI Engine, và API
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List
from datetime import datetime
import threading


class DriveMode(str, Enum):
    MANUAL = "MANUAL"           # Điều khiển thủ công từ server
    AUTOPILOT = "AUTOPILOT"     # Tự lái hoàn toàn (AI)
    WAYPOINT = "WAYPOINT"       # Theo lộ trình waypoints
    HYBRID = "HYBRID"           # Tự lái + có thể override
    EMERGENCY_STOP = "EMERGENCY_STOP"


class AlertLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass
class GPSPosition:
    lat: float = 0.0
    lon: float = 0.0
    altitude: float = 0.0
    accuracy_m: float = 0.0


@dataclass
class LidarData:
    """
    Dữ liệu LiDAR — distances là dict góc -> khoảng cách (cm)
    Ví dụ: {0: 120.5, 45: 80.2, 90: 200.0, ...}
    """
    distances: dict = field(default_factory=dict)   # angle -> cm
    min_distance_cm: float = 9999.0
    min_distance_angle: float = 0.0
    timestamp: Optional[datetime] = None


@dataclass
class MotorState:
    speed_percent: int = 0          # 0-100%
    direction: str = "STOP"         # FORWARD / BACKWARD / STOP
    left_pwm: int = 0
    right_pwm: int = 0


@dataclass
class ServoState:
    angle: int = 90                 # 0-180 độ, 90 = thẳng


@dataclass
class Alert:
    level: AlertLevel
    message: str
    vehicle_id: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class Waypoint:
    lat: float
    lon: float
    label: str = ""
    speed_percent: int = 60


class VehicleState:
    """
    Singleton-style state container, thread-safe
    """
    def __init__(self, vehicle_id: str):
        self.vehicle_id = vehicle_id
        self._lock = threading.RLock()

        self.mode: DriveMode = DriveMode.MANUAL
        self.connected: bool = False
        self.last_seen: Optional[datetime] = None

        self.gps: GPSPosition = GPSPosition()
        self.lidar: LidarData = LidarData()
        self.motor: MotorState = MotorState()
        self.servo: ServoState = ServoState()

        self.waypoints: List[Waypoint] = []
        self.current_waypoint_index: int = 0

        self.alerts: List[Alert] = []
        self.obstacle_detected: bool = False

    def update(self, **kwargs):
        with self._lock:
            for key, val in kwargs.items():
                if hasattr(self, key):
                    setattr(self, key, val)

    def add_alert(self, level: AlertLevel, message: str):
        with self._lock:
            alert = Alert(level=level, message=message, vehicle_id=self.vehicle_id)
            self.alerts.append(alert)
            # Giữ tối đa 100 alert gần nhất
            if len(self.alerts) > 100:
                self.alerts = self.alerts[-100:]
        return alert

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "vehicle_id": self.vehicle_id,
                "mode": self.mode.value,
                "connected": self.connected,
                "last_seen": self.last_seen.isoformat() if self.last_seen else None,
                "gps": {
                    "lat": self.gps.lat,
                    "lon": self.gps.lon,
                    "altitude": self.gps.altitude,
                },
                "lidar": {
                    "min_distance_cm": self.lidar.min_distance_cm,
                    "min_distance_angle": self.lidar.min_distance_angle,
                    "scan_points": len(self.lidar.distances),
                },
                "motor": {
                    "speed_percent": self.motor.speed_percent,
                    "direction": self.motor.direction,
                    "left_pwm": self.motor.left_pwm,
                    "right_pwm": self.motor.right_pwm,
                },
                "servo": {
                    "angle": self.servo.angle,
                },
                "obstacle_detected": self.obstacle_detected,
                "waypoints_total": len(self.waypoints),
                "current_waypoint": self.current_waypoint_index,
                "recent_alerts": [
                    {
                        "level": a.level.value,
                        "message": a.message,
                        "time": a.timestamp.isoformat(),
                    }
                    for a in self.alerts[-10:]
                ],
            }


# Global registry — hỗ trợ nhiều xe
_vehicle_registry: dict[str, VehicleState] = {}
_registry_lock = threading.Lock()


def get_vehicle(vehicle_id: str) -> VehicleState:
    with _registry_lock:
        if vehicle_id not in _vehicle_registry:
            _vehicle_registry[vehicle_id] = VehicleState(vehicle_id)
        return _vehicle_registry[vehicle_id]


def list_vehicles() -> list[VehicleState]:
    with _registry_lock:
        return list(_vehicle_registry.values())
