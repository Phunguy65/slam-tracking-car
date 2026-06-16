# Person Tracking Mode — Full Workflow

## Tổng quan

Person Tracking Mode cho phép robot tự động đi theo một người cụ thể (hoặc người gần nhất).
Luồng dữ liệu đi qua 3 tầng:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB DASHBOARD                                  │
│  (Next.js app + roslib WebSocket → rosbridge_websocket port 9090)           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ publish/subscribe qua rosbridge
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROS2 HUMBLE (Linux)                                │
│                                                                             │
│  ┌──────────────┐   /camera/     ┌───────────────────┐   /tracked_persons  │
│  │ cam_bridge   │──image_raw───▶│  person_tracker   │─────────────────────▶│
│  │ _node        │               │  _node            │                      │
│  └──────┬───────┘               └───────────────────┘                      │
│         │                                                                   │
│  HTTP GET MJPEG                   ┌───────────────────┐   /cmd_vel         │
│         │                         │ tracking_controller│──────────────────▶ │
│         │                         │ _node             │   /servo_cmd        │
│         │                         └───────────────────┘──────────────────▶ │
│         │                                                                   │
│         │                         ┌───────────────────┐                     │
│         │                         │ enrollment_node   │ (face DB CRUD)      │
│         │                         └───────────────────┘                     │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │ HTTP MJPEG stream                     │ micro-ROS UDP
          │                                       ▼
┌─────────┴───────────────────────────────────────────────────────────────────┐
│                        FIRMWARE (ESP32 × 2)                                  │
│                                                                             │
│  ┌─────────────────────┐          ┌────────────────────────────────────┐   │
│  │ ESP32-CAM           │          │ ESP32 Main Board                   │   │
│  │ (cam_main.cpp)      │          │ (main.cpp + ros_bridge.cpp)        │   │
│  │                     │          │                                    │   │
│  │ • MJPEG stream :80  │          │ SUB /cmd_vel    → motors           │   │
│  │ • micro-ROS WiFi    │          │ SUB /servo_cmd  → servo pan        │   │
│  │ • PUB cam/wifi_rssi │          │ PUB /scan       → LiDAR data       │   │
│  └─────────────────────┘          │ PUB /odom       → encoder odometry │   │
│                                   │ PUB /joint_states → servo position  │   │
│                                   └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## TẦNG 1: Web Dashboard (app/)

### Kết nối ROS

Web app sử dụng **roslibjs** kết nối đến `rosbridge_websocket` (port 9090) qua WebSocket.

- `real-client.ts`: singleton quản lý kết nối, tự reconnect mỗi 2s nếu mất.
- `use-topic.ts`: React hook `usePublisher()` / `useTopic()` để publish/subscribe ROS topics.

### Bật/Tắt Tracking

File: `tracking-panels.tsx`

Khi user bật switch "Face Tracking":

1. Zustand store (`dashboard-store.ts`) set `trackingEnabled = true`
2. Publish message `{ data: true }` lên topic `/tracking_controller/enabled` (type `std_msgs/Bool`)
3. Tracking controller node nhận message → bắt đầu xử lý output

Khi user tắt:
- Publish `{ data: false }` → controller dừng
- Đồng thời publish `/cmd_vel` với tất cả 0 → dừng robot ngay lập tức

### Chọn Target Person

- User enroll khuôn mặt qua `EnrollModal` → gọi ROS service `/enrollment/add_person`
- Chọn target → gọi service `/enrollment/set_tracking_target`
- `enrollment_node` lưu vào SQLite (`~/.slam_car/face_db.sqlite`)
- `person_tracker_node` poll database mỗi 1s, hot-reload embeddings khi file thay đổi

### Manual Override

Khi bật Manual Override:
- Tắt tracking controller (publish enabled=false)
- User dùng joystick → publish `/cmd_vel` trực tiếp từ web

---

## TẦNG 2: ROS2 — Giải thuật nhận dạng và điều khiển

### Node 1: cam_bridge_node

**File:** `slam_car_perception/cam_bridge_node.py`

**Vai trò:** Cầu nối ESP32-CAM → ROS2 image topic

```
ESP32-CAM (HTTP MJPEG :80)
        │
        │  cv2.VideoCapture(url)
        ▼
cam_bridge_node
        │
        ├──▶ /camera/image_raw   (sensor_msgs/Image, BGR8)
        └──▶ /camera_info        (sensor_msgs/CameraInfo)
```

- Timer chạy theo FPS (default 10Hz)
- Mỗi tick: `cap.read()` → `cv2_to_imgmsg()` → publish
- Tính camera intrinsics từ FOV ngang (default 62°): `fx = width / (2 * tan(fov/2))`
- Tự reconnect nếu stream mất

---

### Node 2: person_tracker_node

**File:** `slam_car_perception/person_tracker_node.py`

**Vai trò:** Phát hiện người, nhận dạng khuôn mặt, xác định target

```
/camera/image_raw ──▶ [YOLOv8n: detect person class=0]
                            │
                            ▼
                     Crop body region
                            │
                            ▼
                     [InsightFace buffalo_l: detect face + extract embedding]
                            │
                            ▼
                     [Cosine similarity vs enrolled embeddings]
                            │
                            ▼
                     [BearingTransform: pixel → laser_link bearing]
                            │
                            ▼
                     [LiDAR fusion: bearing cone → range_m]
                            │
                            ▼
                     /tracked_persons (TrackedPersonArray)
```

#### Chi tiết từng bước:

**Bước 1 — Body Detection:**
- YOLOv8n chạy inference, filter class=0 (person), confidence > 0.5
- Output: bounding box normalized (0..1) trong ảnh

**Bước 2 — Face Detection + Recognition:**
- Crop vùng body từ frame gốc
- InsightFace detect face trong crop → extract 512-dim embedding
- Normalize embedding, tính cosine similarity với tất cả enrolled persons
- Nếu best score ≥ 0.6 (threshold) → gán person_id

**Bước 3 — Tracking (IoU-based):**
- Match body bbox mới với tracked persons cũ bằng IoU > 0.3
- Nếu match → giữ track_id, cập nhật position
- Nếu không match → tạo track mới
- Track mất > 1s → xóa

**Bước 4 — Confidence Decay:**
- Khi face không visible → decay confidence theo thời gian (rate 0.1/s)
- Confidence < 0.3 → drop identity (person_id = "")
- Giúp tránh false positive khi track di chuyển ra ngoài camera

**Bước 5 — Bearing Transform:**
- Pixel center_x → camera bearing angle: `θ_cam = atan((u - cx) / fx)`
- Transform bearing từ `camera_optical_frame` sang `laser_link` qua TF2
- Cần vì camera gắn trên servo pan → góc thay đổi liên tục

**Bước 6 — LiDAR Range Fusion:**
- Tìm tất cả LiDAR rays trong cone ±0.17 rad (~10°) quanh bearing
- Filter: range 0.3m–4.0m, finite only
- Lấy `min(valid_ranges)` → khoảng cách đến người
- Nếu không có ray valid → range = NaN

**Bước 7 — Target Selection:**
- Nếu `current_target_id` set (từ web) → mark `is_target` cho person khớp ID
- Nếu không set target → auto-pick người có body bbox lớn nhất (gần nhất)

---

### Node 3: tracking_controller_node

**File:** `slam_car_perception/tracking_controller_node.py`

**Vai trò:** Điều khiển servo + bánh xe để follow target

```
/tracked_persons ──▶ [FSM: IDLE / TRACKING / SEARCH_SCAN]
                            │
                            ├──▶ /servo_cmd    (JointState, camera_pan_joint)
                            └──▶ /cmd_vel      (Twist, linear.x + angular.z)
```

#### State Machine:

```
        ┌──────────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
    ┌────────┐  target found (≥3 frames)  ┌──────────┐    │
    │  IDLE  │ ─────────────────────────▶ │ TRACKING │    │
    └────────┘                            └─────┬────┘    │
        ▲                                       │         │
        │  scan timeout (6s)                    │ lost >2s│
        │                                       ▼         │
        │                               ┌─────────────┐  │
        └────────────────────────────── │ SEARCH_SCAN │──┘
                                        └─────────────┘
                                         (quét servo tìm)
```

#### Control Loops:

**Servo Control (50Hz):**
- Khi TRACKING: PID (Kp=2.0, Ki=0, Kd=0.1) điều khiển servo theo bearing error
- `error = target.bearing_rad - current_servo_angle`
- Output: góc servo mới, publish `/servo_cmd`
- Khi SEARCH_SCAN: quét servo qua lại ±90° (1.57 rad)

**Wheel Yaw Control (10Hz):**
- Servo có "handoff threshold" = 0.52 rad (~30°)
- Nếu |servo_angle| ≤ 30° → chỉ servo quay, bánh xe đứng yên
- Nếu |servo_angle| > 30° → PID yaw (Kp=0.5) xoay robot, đồng thời kéo servo về center
- Ý tưởng: servo phản ứng nhanh, khi lệch quá → body robot xoay theo

**Linear Control (10Hz):**
- PID (Kp=0.3) giữ khoảng cách target trong band [0.15m, 0.25m]
- Nếu range = NaN → không di chuyển
- Nếu trong band → dừng (deadband)
- Nếu quá xa → tiến, quá gần → lùi

**Safety — Obstacle Avoidance:**
- Check LiDAR front arc (±0.35 rad, ~20°)
- Nếu có vật < 0.15m phía trước → block `linear.x > 0` (không cho tiến)
- Cho phép lùi và xoay

---

### Node 4: enrollment_node

**File:** `slam_car_perception/enrollment_node.py`

**Vai trò:** Quản lý cơ sở dữ liệu khuôn mặt

- Subscribe `/enrollment/image` (webcam từ browser gửi qua rosbridge)
- Detect face → extract embedding → average nhiều frames (10 frames)
- Lưu vào SQLite: `persons(id, name, embedding)`
- Services: `AddPerson`, `RemovePerson`, `ListPersons`, `SetTrackingTarget`, `GetTrackingTarget`
- `person_tracker_node` poll file SQLite mỗi 1s để hot-reload

---

## TẦNG 3: Firmware (ESP32)

### ESP32-CAM (cam_main.cpp)

**Vai trò:** Camera stream + telemetry

- Khởi tạo camera OV2640 (AI-Thinker board)
- Serve MJPEG stream qua HTTP server port 80 (WiFiServer)
- Frame rate: ~10 FPS (100ms interval)
- micro-ROS node `slam_car_cam`:
  - PUB `cam/wifi_rssi` — WiFi signal quality
  - SUB `cam/stream_enable` — web có thể tắt/bật stream

**Flow stream:**
```
Browser nhấn "enable" → rosbridge → /cam/stream_enable (Bool true)
                                         │
cam_bridge_node ←── HTTP GET ─── ESP32-CAM (MJPEG :80)
  mỗi frame:                        │
  cap.read() ◄───────────────────────┘
```

---

### ESP32 Main Board (main.cpp + ros_bridge.cpp + motors.cpp)

**Vai trò:** Nhận lệnh ROS2, điều khiển phần cứng

#### Startup Flow:
```
setup()
  ├── WiFi connect
  ├── ros_bridge_init()
  │     ├── set_microros_wifi_transports(SSID, PASS, AGENT_IP, AGENT_PORT)
  │     ├── Wait for micro-ROS agent
  │     ├── Create node "slam_car_esp32"
  │     ├── Time sync (rmw_uros_sync_session)
  │     ├── Publishers: /scan, /odom, /imu/data_raw, /joint_states
  │     └── Subscribers: /cmd_vel, /servo_cmd
  ├── motors_init()   — TB6612FNG driver, LEDC PWM setup
  ├── encoders_init() — interrupt-based wheel encoders (20 PPR)
  ├── imu_init()      — MPU6050 I2C
  ├── lidar_init()    — LDS02RR UART
  └── servos_init()   — camera pan servo
```

#### Runtime Loop:
```
loop()
  ├── lidar_loop()       — đọc data UART từ LDS02RR
  ├── ros_bridge_spin()  — spin executor, ping agent, time sync
  └── lidar_loop()       — đọc thêm (LiDAR cần poll thường xuyên)
```

#### cmd_vel Callback:

Khi `/cmd_vel` message đến (từ tracking_controller hoặc web joystick):

```
cmd_vel_callback(Twist msg)
  │
  ├── safety_notify_cmd_vel()     — reset watchdog timer
  │
  ├── if safety_is_motion_allowed():
  │     └── motors_apply_cmd_vel(linear.x, angular.z)
  │              │
  │              ├── Differential drive kinematics:
  │              │     left_speed  = linear_x - angular_z * WHEEL_SEPARATION/2
  │              │     right_speed = linear_x + angular_z * WHEEL_SEPARATION/2
  │              │
  │              ├── Speed → PWM mapping (80–170 range)
  │              │
  │              ├── Turn boost logic:
  │              │     • In-place turn: PWM min = 235
  │              │     • Mixed (move + turn): PWM min = 200
  │              │     • Deadband: |angular| < 0.08 → no turn boost
  │              │
  │              └── Set GPIO direction + ledcWrite(pwm)
  │
  └── if NOT allowed: do nothing (watchdog stopped motors)
```

#### servo_cmd Callback:

Khi `/servo_cmd` message đến (từ tracking_controller):
```
servo_cmd_callback(JointState msg)
  │
  └── if name == "camera_pan_joint":
        servos_set_pan(radians)  → convert rad → degrees → servo write
```

#### Safety Watchdog:

- Chạy mỗi 20ms (fast_timer_50hz callback)
- Nếu không nhận `/cmd_vel` trong 1000ms → `motors_stop()` (latched)
- Nếu agent mất kết nối → `motors_stop()`
- Nếu LiDAR im lặng 2000ms → pause scan publishing (nhưng KHÔNG dừng motor)

---

## Toàn bộ Data Flow — Một Cycle Hoàn Chỉnh

```
1. ESP32-CAM chụp frame JPEG, serve qua HTTP MJPEG stream

2. cam_bridge_node (10Hz) lấy frame qua OpenCV → publish /camera/image_raw

3. person_tracker_node nhận frame:
   a. YOLOv8n detect person bounding boxes
   b. InsightFace detect face trong mỗi body crop
   c. So khớp embedding với database → gán person_id
   d. TF2 transform pixel bearing → laser_link frame
   e. Fusion LiDAR cone → range_m
   f. Publish /tracked_persons (TrackedPersonArray)

4. tracking_controller_node (khi enabled=true) nhận /tracked_persons:
   a. Lọc person có is_target=true
   b. Servo PID (50Hz): điều chỉnh góc camera pan theo bearing
   c. Wheel yaw PID (10Hz): xoay robot khi servo lệch > 30°
   d. Linear PID (10Hz): tiến/lùi giữ khoảng cách 15–25cm
   e. Obstacle check: block forward nếu vật < 15cm phía trước
   f. Publish /cmd_vel (Twist) + /servo_cmd (JointState)

5. micro-ROS agent chuyển /cmd_vel và /servo_cmd qua UDP đến ESP32

6. ESP32 Main Board:
   a. cmd_vel_callback → differential drive math → PWM motors
   b. servo_cmd_callback → servos_set_pan(radians)
   c. safety_check() mỗi 20ms — watchdog nếu mất kết nối

7. ESP32 đồng thời publish feedback:
   /odom (50Hz), /scan (5Hz), /joint_states (50Hz)
   → person_tracker dùng /scan cho range fusion
   → tracking_controller dùng /scan cho obstacle check
```

---

## Launch file

**File:** `slam_car_bringup/launch/person_tracking.launch.py`

Khởi động tất cả nodes cần thiết:
1. `robot.launch.py` — micro-ROS agent + robot_state_publisher + cam_bridge
2. `enrollment_node` — quản lý face DB
3. `person_tracker_node` — detect + recognize
4. `tracking_controller_node` — PID control
5. `rosbridge_websocket` — cho web UI kết nối

---

## Các Topic/Service chính

| Topic/Service | Type | Hướng | Mô tả |
|---|---|---|---|
| `/camera/image_raw` | sensor_msgs/Image | cam_bridge → tracker | Frame BGR8 từ ESP32-CAM |
| `/camera_info` | sensor_msgs/CameraInfo | cam_bridge → tracker | Camera intrinsics (fx, fy, cx, cy) |
| `/tracked_persons` | TrackedPersonArray | tracker → controller | Danh sách người phát hiện được |
| `/tracking_controller/enabled` | std_msgs/Bool | web → controller | Bật/tắt tracking mode |
| `/tracking_controller/status` | std_msgs/String | controller → web | JSON status (state, target, range) |
| `/cmd_vel` | geometry_msgs/Twist | controller → ESP32 | Lệnh vận tốc (linear.x, angular.z) |
| `/servo_cmd` | sensor_msgs/JointState | controller → ESP32 | Lệnh góc servo (radians) |
| `/scan` | sensor_msgs/LaserScan | ESP32 → tracker | LiDAR 360° (0.13–8.0m) |
| `/joint_states` | sensor_msgs/JointState | ESP32 → ROS | Servo position hiện tại |
| `/odom` | nav_msgs/Odometry | ESP32 → ROS | Wheel encoder odometry |
| `/enrollment/add_person` | srv AddPerson | web → enrollment | Enroll face mới |
| `/enrollment/set_tracking_target` | srv SetTrackingTarget | web → enrollment | Chọn target để follow |

---

## Điểm thiết kế đáng chú ý

1. **Servo-first, wheel-second**: Servo phản ứng nhanh (50Hz PID), bánh xe chỉ xoay khi servo lệch quá 30° — giúp tracking mượt, ít giật.

2. **Confidence decay**: Khi mất face → không drop identity ngay, decay dần. Tránh flicker khi người quay đầu ngắn.

3. **LiDAR fusion thay vì depth camera**: Dùng bearing từ camera + range từ LiDAR (cone ±10°) — rẻ hơn depth camera, hoạt động outdoor.

4. **Hot-reload database**: `person_tracker_node` poll SQLite file mtime mỗi 1s — không cần restart khi enroll người mới.

5. **Safety layers chồng nhau**:
   - Firmware watchdog: 1s không nhận cmd_vel → dừng
   - Agent disconnect → dừng ngay
   - ROS-side obstacle check: LiDAR front arc < 15cm → block forward
   - Web "stop": publish cmd_vel zeros + disable controller

6. **Separation of concerns**: Camera board riêng (stream only) vs Main board (motors + sensors). Nếu camera lag → motors vẫn an toàn nhờ watchdog.
