# 🚗 Autonomous Vehicle Server

Server điều khiển xe tự lái với Python + MQTT + FastAPI

## Cấu trúc thư mục

```
autonomous-vehicle-server/
├── main.py                    # Entry point
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
├── .env                       # Config (copy từ .env.example)
│
├── core/
│   ├── config.py              # Cấu hình toàn hệ thống
│   ├── logger.py              # Logging setup
│   └── vehicle_state.py       # Model trạng thái xe (thread-safe)
│
├── mqtt/
│   └── broker_manager.py      # MQTT pub/sub + routing
│
├── autopilot/
│   └── engine.py              # AI engine: tránh vật cản, waypoint nav
│
├── api/
│   ├── app.py                 # FastAPI routes
│   └── dashboard.py           # Web dashboard HTML
│
├── firmware/
│   └── esp32_main.py          # MicroPython code cho ESP32
│
├── simulator/
│   └── vehicle_sim.py         # Giả lập xe để test
│
├── broker/
│   └── mosquitto.conf         # Config MQTT broker
│
└── logs/                      # Log files
```

# 🤖 Kiến Trúc Luồng Điều Khiển Robot Tự Hành (Navigation Pipeline)

Tài liệu này mô tả luồng dữ liệu (Data Flow) từ lúc nhận tín hiệu cảm biến LiDAR cho đến khi xuất lệnh điều khiển xuống phần cứng ESP32.

## 1. Sơ đồ khối (Architecture Diagram)

```text
LiDAR scan (mỗi 100ms)
         │
         ▼
┌─────────────────┐
│  Localizer      │  ICP scan matching → cập nhật Pose (x, y, yaw)
│  (localizer.py) │  + cập nhật OccupancyGrid (tường/vật cản)
└────────┬────────┘
         │ pose hiện tại
         ▼
┌─────────────────┐
│  A* Planner     │  Tìm đường ngắn nhất tránh vật cản
│  (path_planner) │  trả về list waypoints (mét)
└────────┬────────┘
         │ path
         ▼
┌─────────────────┐
│MotionController │  Pure Pursuit + PID → speed% + servo angle
│(motion_ctrl.py) │  Giảm tốc khi quẹo/gần đích, replan khi bị chặn
└────────┬────────┘
         │ lệnh
         ▼
    MQTT → ESP32



## Chạy nhanh

```bash
# 1. Cài dependencies
pip install -r requirements.txt

# 2. Khởi động MQTT broker
docker-compose up mosquitto -d

# 3. Chạy server
python main.py

# 4. Giả lập xe (terminal khác)
python simulator/vehicle_sim.py

# 5. Mở dashboard
open http://localhost:8000/dashboard
# hoặc API docs
open http://localhost:8000/docs
```

## Các chế độ lái

| Mode | Mô tả |
|------|-------|
| MANUAL | Điều khiển từ dashboard/API |
| AUTOPILOT | AI tự lái, tránh vật cản tự động |
| WAYPOINT | Di chuyển theo danh sách GPS |
| HYBRID | Tự lái nhưng có thể override thủ công |
| EMERGENCY_STOP | Dừng khẩn cấp |

## API chính

```
GET  /vehicles                          # Danh sách xe
GET  /vehicles/{id}                     # Trạng thái xe
POST /vehicles/{id}/mode                # Đổi chế độ
POST /vehicles/{id}/control             # Điều khiển thủ công
POST /vehicles/{id}/stop                # Dừng khẩn cấp
POST /vehicles/{id}/waypoints           # Nạp waypoints
GET  /vehicles/{id}/alerts              # Lịch sử alert
GET  /dashboard                         # Web UI
```

## MQTT Topics

| Topic | QoS | Chiều | Mô tả |
|-------|-----|-------|-------|
| vehicles/{id}/gps | 0 | ESP32→Server | GPS data |
| vehicles/{id}/lidar | 0 | ESP32→Server | LiDAR scan |
| vehicles/{id}/speed | 0 | ESP32→Server | Tốc độ hiện tại |
| vehicles/{id}/status | 1 | Both | Online/offline |
| vehicles/{id}/alerts | 2 | ESP32→Server | Cảnh báo |
| vehicles/{id}/commands | 2 | Server→ESP32 | Lệnh điều khiển |

## ESP32 Setup

1. Flash MicroPython lên ESP32
2. Sửa `firmware/esp32_main.py`: WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER
3. Upload lên ESP32 bằng Thonny hoặc `mpremote`
4. Kết nối motor L298N, servo, LiDAR theo pin config trong file
