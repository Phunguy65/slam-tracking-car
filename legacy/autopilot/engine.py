"""
Autopilot Engine — AI điều khiển xe tự lái
Chạy vòng lặp liên tục, ra quyết định dựa trên LiDAR + GPS + Waypoints
"""
import asyncio
import logging
import math
from core.config import settings
from core.vehicle_state import VehicleState, DriveMode, AlertLevel

logger = logging.getLogger(__name__)


class AutopilotEngine:
    """
    Vòng lặp điều khiển chính:
    1. Đọc trạng thái xe (LiDAR, GPS, mode)
    2. Ra quyết định (tránh vật cản, đi đến waypoint)
    3. Gửi lệnh motor + servo về xe qua MQTT
    """

    def __init__(self, vehicle: VehicleState, mqtt_manager):
        self.vehicle = vehicle
        self.mqtt = mqtt_manager
        self._running = False
        self._task = None

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info(f"🤖 Autopilot started for [{self.vehicle.vehicle_id}]")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def _loop(self):
        interval = 1.0 / settings.AUTOPILOT_LOOP_HZ
        while self._running:
            try:
                mode = self.vehicle.mode
                if mode == DriveMode.AUTOPILOT:
                    await self._run_autopilot()
                elif mode == DriveMode.WAYPOINT:
                    await self._run_waypoint()
                elif mode == DriveMode.HYBRID:
                    # HYBRID: autopilot nhưng tránh vật cản override thủ công
                    await self._run_obstacle_guard()
                # MANUAL: không làm gì, xe nhận lệnh trực tiếp từ API
            except Exception as e:
                logger.error(f"Autopilot loop error: {e}")
            await asyncio.sleep(interval)

    # ── Autopilot (AI tự lái) ──────────────────────────────────

    async def _run_autopilot(self):
        """
        Đơn giản: tiến thẳng, né vật cản bằng cách rẽ
        Có thể thay bằng thuật toán phức tạp hơn (VFH, DWA, A*)
        """
        v = self.vehicle

        if v.obstacle_detected:
            await self._avoid_obstacle()
            return

        # Không có vật cản → tiến thẳng tốc độ mặc định
        self.mqtt.send_motor(v.vehicle_id, speed=60, direction="FORWARD")
        self.mqtt.send_servo(v.vehicle_id, angle=90)   # Thẳng

    async def _avoid_obstacle(self):
        """
        Thuật toán tránh vật cản đơn giản:
        - Dừng lại
        - Xét phía nào nhiều khoảng trống hơn → rẽ sang đó
        """
        v = self.vehicle
        distances = v.lidar.distances

        # Dừng trước
        self.mqtt.send_motor(v.vehicle_id, speed=0, direction="STOP")
        await asyncio.sleep(0.3)

        # Tính tổng khoảng trống bên trái (270-360°) và phải (0-90°)
        left_space = self._avg_distance_in_range(distances, 270, 360)
        right_space = self._avg_distance_in_range(distances, 0, 90)

        logger.info(f"Avoiding obstacle: left={left_space:.0f}cm, right={right_space:.0f}cm")

        if right_space > left_space:
            # Rẽ phải
            self.mqtt.send_servo(v.vehicle_id, angle=135)
            v.add_alert(AlertLevel.INFO, "Avoiding obstacle → turning RIGHT")
        else:
            # Rẽ trái
            self.mqtt.send_servo(v.vehicle_id, angle=45)
            v.add_alert(AlertLevel.INFO, "Avoiding obstacle → turning LEFT")

        # Tiến chậm qua vật cản
        self.mqtt.send_motor(v.vehicle_id, speed=40, direction="FORWARD")
        await asyncio.sleep(0.8)

        # Trả servo về thẳng
        self.mqtt.send_servo(v.vehicle_id, angle=90)

    # ── Waypoint Navigation ────────────────────────────────────

    async def _run_waypoint(self):
        v = self.vehicle

        if not v.waypoints:
            logger.info(f"[{v.vehicle_id}] No waypoints set, idling.")
            self.mqtt.send_motor(v.vehicle_id, speed=0, direction="STOP")
            return

        if v.current_waypoint_index >= len(v.waypoints):
            logger.info(f"[{v.vehicle_id}] ✅ All waypoints reached!")
            v.update(mode=DriveMode.MANUAL)
            self.mqtt.send_motor(v.vehicle_id, speed=0, direction="STOP")
            v.add_alert(AlertLevel.INFO, "All waypoints completed!")
            return

        target = v.waypoints[v.current_waypoint_index]
        current = v.gps

        dist_m = self._haversine(current.lat, current.lon, target.lat, target.lon)
        bearing = self._bearing(current.lat, current.lon, target.lat, target.lon)

        # Đã đến điểm → chuyển waypoint tiếp theo
        if dist_m < settings.WAYPOINT_ARRIVAL_RADIUS_M:
            logger.info(f"[{v.vehicle_id}] Reached waypoint {v.current_waypoint_index}: {target.label}")
            v.add_alert(AlertLevel.INFO, f"Reached waypoint: {target.label}")
            v.current_waypoint_index += 1
            return

        # Tránh vật cản ưu tiên cao hơn waypoint
        if v.obstacle_detected:
            await self._avoid_obstacle()
            return

        # Tính góc servo dựa trên bearing
        servo_angle = self._bearing_to_servo(bearing, current)
        speed = target.speed_percent

        # Giảm tốc nếu gần vật cản
        if v.lidar.min_distance_cm < settings.LIDAR_SLOW_THRESHOLD_CM:
            speed = int(speed * 0.5)

        self.mqtt.send_servo(v.vehicle_id, angle=servo_angle)
        self.mqtt.send_motor(v.vehicle_id, speed=speed, direction="FORWARD")

    # ── Hybrid mode (obstacle guard) ──────────────────────────

    async def _run_obstacle_guard(self):
        """
        HYBRID: chỉ can thiệp khi phát hiện vật cản,
        còn lại nhường cho lệnh thủ công từ API
        """
        if self.vehicle.obstacle_detected:
            await self._avoid_obstacle()

    # ── Utility math ──────────────────────────────────────────

    @staticmethod
    def _avg_distance_in_range(distances: dict, start: float, end: float) -> float:
        vals = [v for k, v in distances.items() if start <= k <= end]
        return sum(vals) / len(vals) if vals else 9999.0

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2) -> float:
        """Tính khoảng cách (meters) giữa 2 tọa độ GPS"""
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    @staticmethod
    def _bearing(lat1, lon1, lat2, lon2) -> float:
        """Tính hướng (độ) từ điểm 1 tới điểm 2"""
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dlam = math.radians(lon2 - lon1)
        x = math.sin(dlam) * math.cos(phi2)
        y = math.cos(phi1)*math.sin(phi2) - math.sin(phi1)*math.cos(phi2)*math.cos(dlam)
        return (math.degrees(math.atan2(x, y)) + 360) % 360

    @staticmethod
    def _bearing_to_servo(target_bearing: float, current_gps) -> int:
        """
        Chuyển bearing (0-360) thành góc servo (0-180)
        Đây là simplified — thực tế cần compass heading của xe
        """
        # Giả sử xe đang hướng North (0°)
        diff = target_bearing
        if diff > 180:
            diff -= 360
        # diff: -180..180, map sang servo 0..180
        servo = int(90 + (diff / 180) * 90)
        return max(30, min(150, servo))   # Giới hạn góc lái an toàn
