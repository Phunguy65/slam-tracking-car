"""
FastAPI App — REST API để điều khiển xe
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from core.vehicle_state import get_vehicle, list_vehicles, DriveMode, Waypoint
from mqtt.broker_manager import get_mqtt


# ── Request schemas ────────────────────────────────────────────

class ManualControlRequest(BaseModel):
    speed: int = Field(0, ge=0, le=100, description="0-100%")
    direction: str = Field("STOP", description="FORWARD / BACKWARD / STOP")
    servo_angle: int = Field(90, ge=0, le=180, description="0=full left, 90=straight, 180=full right")

class SetModeRequest(BaseModel):
    mode: DriveMode

class WaypointItem(BaseModel):
    lat: float
    lon: float
    label: str = ""
    speed_percent: int = Field(60, ge=10, le=100)

class WaypointListRequest(BaseModel):
    waypoints: List[WaypointItem]


# ── App factory ────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Autonomous Vehicle Server",
        description="API điều khiển xe tự lái",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    mqtt = get_mqtt()

    # ── Vehicle status ─────────────────────────────────────────

    @app.get("/vehicles", summary="Danh sách xe đang kết nối")
    def list_all_vehicles():
        return [v.to_dict() for v in list_vehicles()]

    @app.get("/vehicles/{vehicle_id}", summary="Trạng thái chi tiết xe")
    def get_vehicle_status(vehicle_id: str):
        return get_vehicle(vehicle_id).to_dict()

    # ── Mode control ───────────────────────────────────────────

    @app.post("/vehicles/{vehicle_id}/mode", summary="Đổi chế độ lái")
    def set_mode(vehicle_id: str, req: SetModeRequest):
        vehicle = get_vehicle(vehicle_id)
        old_mode = vehicle.mode
        vehicle.update(mode=req.mode)
        mqtt.send_mode(vehicle_id, req.mode.value)

        if req.mode == DriveMode.WAYPOINT and not vehicle.waypoints:
            return {"warning": "Mode set to WAYPOINT but no waypoints loaded!"}

        return {
            "vehicle_id": vehicle_id,
            "mode": req.mode.value,
            "previous_mode": old_mode.value,
        }

    # ── Manual control ─────────────────────────────────────────

    @app.post("/vehicles/{vehicle_id}/control", summary="Điều khiển thủ công motor + servo")
    def manual_control(vehicle_id: str, req: ManualControlRequest):
        vehicle = get_vehicle(vehicle_id)
        if vehicle.mode not in (DriveMode.MANUAL, DriveMode.HYBRID):
            raise HTTPException(
                status_code=400,
                detail=f"Vehicle is in {vehicle.mode.value} mode. Switch to MANUAL or HYBRID first."
            )
        mqtt.send_motor(vehicle_id, req.speed, req.direction)
        mqtt.send_servo(vehicle_id, req.servo_angle)
        return {"status": "sent", "speed": req.speed, "direction": req.direction, "servo": req.servo_angle}

    @app.post("/vehicles/{vehicle_id}/stop", summary="Dừng xe ngay lập tức")
    def emergency_stop(vehicle_id: str):
        vehicle = get_vehicle(vehicle_id)
        vehicle.update(mode=DriveMode.EMERGENCY_STOP)
        mqtt.send_command(vehicle_id, {"command": "STOP"}, qos=2)
        mqtt.send_servo(vehicle_id, 90)
        return {"status": "EMERGENCY_STOP sent"}

    # ── Waypoints ──────────────────────────────────────────────

    @app.post("/vehicles/{vehicle_id}/waypoints", summary="Nạp danh sách waypoints")
    def set_waypoints(vehicle_id: str, req: WaypointListRequest):
        vehicle = get_vehicle(vehicle_id)
        vehicle.waypoints = [
            Waypoint(lat=w.lat, lon=w.lon, label=w.label, speed_percent=w.speed_percent)
            for w in req.waypoints
        ]
        vehicle.current_waypoint_index = 0
        return {
            "status": "loaded",
            "count": len(vehicle.waypoints),
            "waypoints": [{"lat": w.lat, "lon": w.lon, "label": w.label} for w in vehicle.waypoints],
        }

    @app.get("/vehicles/{vehicle_id}/waypoints", summary="Xem waypoints hiện tại")
    def get_waypoints(vehicle_id: str):
        vehicle = get_vehicle(vehicle_id)
        return {
            "current_index": vehicle.current_waypoint_index,
            "waypoints": [
                {"index": i, "lat": w.lat, "lon": w.lon, "label": w.label, "speed": w.speed_percent}
                for i, w in enumerate(vehicle.waypoints)
            ],
        }

    @app.delete("/vehicles/{vehicle_id}/waypoints", summary="Xóa tất cả waypoints")
    def clear_waypoints(vehicle_id: str):
        vehicle = get_vehicle(vehicle_id)
        vehicle.waypoints = []
        vehicle.current_waypoint_index = 0
        return {"status": "cleared"}

    # ── Alerts ─────────────────────────────────────────────────

    @app.get("/vehicles/{vehicle_id}/alerts", summary="Xem lịch sử alert")
    def get_alerts(vehicle_id: str, limit: int = 20):
        vehicle = get_vehicle(vehicle_id)
        alerts = vehicle.alerts[-limit:]
        return [
            {"level": a.level.value, "message": a.message, "time": a.timestamp.isoformat()}
            for a in reversed(alerts)
        ]

    # ── Dashboard ──────────────────────────────────────────────

    @app.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
    def dashboard():
        from api.dashboard import DASHBOARD_HTML
        return DASHBOARD_HTML

    return app
