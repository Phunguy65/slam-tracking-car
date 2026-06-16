# Navigation Mode — Full Workflow

## Tổng quan

Navigation mode cho phép robot tự lái đến một điểm đích mà người dùng chọn trên bản đồ.
Workflow đi qua 3 tầng: **Web App** → **ROS2 (Nav2 stack)** → **ESP32 Firmware**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TỔNG QUAN KIẾN TRÚC                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Web Browser]                                                          │
│       │  Click vào bản đồ                                               │
│       ▼                                                                 │
│  [GoalSetter] ──→ [NavStore] ──→ [roslibjs Action Client]              │
│       │                               │                                 │
│       │                               │  WebSocket (port 9090)          │
│       ▼                               ▼                                 │
│  ─────────────────── ROSBRIDGE ────────────────────────                 │
│                               │                                         │
│                               ▼                                         │
│  [Nav2 BT Navigator] ← NavigateToPose Action                           │
│       │                                                                 │
│       ├──→ [NavFn Planner] ──→ global path (A*)                         │
│       │         ↑                                                       │
│       │    [Global Costmap] ← map + obstacles                           │
│       │                                                                 │
│       └──→ [DWB Controller] ──→ cmd_vel (Twist)                         │
│                 ↑                                                        │
│            [Local Costmap] ← LiDAR real-time                            │
│                               │                                         │
│                               │  cmd_vel topic                          │
│                               ▼                                         │
│  ─────────────── MICRO-ROS AGENT (UDP) ────────────────                 │
│                               │                                         │
│                               ▼                                         │
│  [ESP32 cmd_vel_callback] ──→ [motors_apply_cmd_vel]                    │
│       │                            │                                    │
│       │ safety check               │ differential drive kinematics      │
│       ▼                            ▼                                    │
│  [TB6612FNG Driver] ──→ Motor LEFT + Motor RIGHT (PWM)                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TẦNG 1: Web App (Next.js + roslibjs)

### 1.1 Người dùng click đặt điểm đích

File: `app/src/components/slam/goal-setter.tsx`

Khi user click lên bản đồ:
1. Toạ độ pixel của click được chuyển thành **toạ độ map** (đơn vị mét, frame `map`)
2. Tạo một `PoseStamped` message chứa position (x, y) và orientation (quaternion)
3. Gọi `sendGoal(goalPose)` từ NavStore

```
Click pixel (200, 150)
    │
    ▼  Normalize (0-1) rồi scale ra đơn vị mét
    │  mapX = (normalizedX - 0.5) * 10   ← Bản đồ 10m x 10m
    │  mapY = (0.5 - normalizedY) * 10   ← Lật trục Y
    ▼
PoseStamped {
    header.frame_id: "map",
    pose.position: { x: mapX, y: mapY, z: 0 },
    pose.orientation: quaternion(yaw=0)  ← mặt hướng forward
}
```

### 1.2 NavStore gửi goal qua Action Client

File: `app/src/stores/nav-store.ts`

NavStore là Zustand store singleton quản lý trạng thái navigation:

```
NavStore
├── isExecuting: bool     ← đang di chuyển?
├── feedback: {...}       ← distance_remaining, ETA, recoveries
├── result: {...}         ← kết quả khi hoàn thành
├── error: string|null    ← lỗi nếu có
├── sendGoal(pose)        ← gửi goal mới
└── cancel()              ← huỷ goal đang chạy
```

Khi `sendGoal` được gọi:
1. Kiểm tra WebSocket đang connected
2. Nếu có goal cũ → cancel nó trước
3. Tạo ROS2 Action Client cho `/navigate_to_pose` (type: `nav2_msgs/NavigateToPose`)
4. Gửi goal qua rosbridge WebSocket
5. Đăng ký callback nhận feedback và result

### 1.3 Kênh truyền: roslibjs → rosbridge

File: `app/src/lib/ros-client/real-client.ts`

```
[Browser]
    │
    │  ROSLIB.Action.sendGoal()
    │
    ▼
[roslibjs] ── WebSocket ws://robot-ip:9090 ──→ [rosbridge_server node]
                                                       │
                                                       ▼
                                              ROS2 Action: /navigate_to_pose
```

- **roslibjs**: thư viện JS tạo kết nối WebSocket đến rosbridge
- **rosbridge_server**: ROS2 node dịch JSON ↔ ROS2 messages
- Port mặc định: `9090`, config trong `dashboard.launch.py:70`

---

## TẦNG 2: ROS2 — Nav2 Stack

### 2.1 Hệ thống launch

File: `src/slam_car_bringup/launch/navigation.launch.py`

Navigation launch file khởi động:
1. **robot.launch.py** → micro-ROS agent + robot_state_publisher + EKF + camera
2. **nav2_bringup** → toàn bộ Nav2 stack (AMCL, planner, controller, BT)
3. **map_server** → load bản đồ đã lưu (YAML + PGM)
4. **RViz2** → hiển thị bản đồ + robot + path

### 2.2 AMCL — Định vị robot trên bản đồ

Config: `nav2_params.yaml:3-42`

AMCL (Adaptive Monte Carlo Localization) trả lời câu hỏi: **"Robot đang ở đâu trên bản đồ?"**

```
Tưởng tượng: Bạn đang trong một toà nhà đã có sơ đồ.
Bạn quay camera 360° và thấy tường/cửa ở đâu.
So khớp cái bạn thấy với sơ đồ → biết mình đang đứng ở đâu.
```

- Input: LiDAR scan (`/scan`) + odometry (`/odometry/filtered`) + map
- Output: Transform `map` → `odom` (TF)
- Model: `DifferentialMotionModel` — phù hợp robot 2 bánh
- Laser config: `range 0.15-6.0m` — LDS02RR LiDAR specs
- 500-2000 particles, likelihood field model

### 2.3 BT Navigator — Bộ não điều phối

Config: `nav2_params.yaml:44-104`

BT Navigator nhận goal từ Action `/navigate_to_pose` và điều phối toàn bộ quá trình:

```
Behavior Tree (cây hành vi):
│
├── ComputePathToPose      → Gọi Planner tính đường
│       ↓
├── FollowPath             → Gọi Controller bám theo đường
│       ↓
├── [Nếu bị kẹt]          → Gọi Recovery behaviors
│   ├── Spin               → Quay tại chỗ
│   ├── BackUp             → Lùi lại
│   ├── Wait               → Đợi
│   └── ClearCostmap       → Xoá costmap
│       ↓
└── GoalReached?           → Hoàn thành!
```

Ví dụ đời thực: Giống GPS ô tô, nếu đi sai đường → tính lại, nếu bị kẹt → thử quay đầu.

### 2.4 Planner Server — Tìm đường đi toàn cục

Config: `nav2_params.yaml:237-246`

```
Plugin: NavfnPlanner (thuật toán A*)
├── Input:  robot position + goal position + global costmap
├── Output: đường đi (dãy các điểm từ robot → goal)
├── tolerance: 0.5m     ← chấp nhận goal gần đúng
├── use_astar: true     ← A* nhanh hơn Dijkstra
└── allow_unknown: true ← cho phép đi qua vùng chưa biết
```

**Global Costmap** (config: `nav2_params.yaml:202-235`):
- `static_layer`: bản đồ tĩnh đã lưu (tường, vật cố định)
- `obstacle_layer`: chướng ngại vật real-time từ LiDAR
- `inflation_layer`: "bơm phồng" vật cản ra 0.45m để robot giữ khoảng cách an toàn

```
Ví dụ: Tưởng tượng bạn tìm đường đi trong mê cung trên giấy.
A* vẽ đường ngắn nhất từ A → B, tránh tường (costmap obstacles).
```

### 2.5 Controller Server — Điều khiển cục bộ (DWB)

Config: `nav2_params.yaml:106-167`

Controller chạy ở tần số **10 Hz**, mỗi 100ms tính ra lệnh `cmd_vel`:

```
Plugin: DWB (Dynamic Window Based) Local Planner

Input:  global path + local costmap + robot velocity
Output: geometry_msgs/Twist trên topic /cmd_vel
        ├── linear.x  = tốc độ thẳng (m/s)
        └── angular.z  = tốc độ quay (rad/s)
```

Giới hạn cho robot nhỏ:
- Max linear: **0.3 m/s** (chậm, an toàn)
- Max angular: **1.0 rad/s**
- Acceleration: **0.5 m/s²**
- Robot radius: **0.12m**

DWB hoạt động bằng cách:
1. Tạo nhiều quỹ đạo thử (40 mẫu vx × 40 mẫu vtheta)
2. Chấm điểm mỗi quỹ đạo theo các tiêu chí (critics):
   - `PathDist` + `PathAlign`: bám sát đường global
   - `GoalDist` + `GoalAlign`: hướng về goal
   - `BaseObstacle`: tránh vật cản
   - `RotateToGoal`: xoay đúng hướng khi gần goal
   - `Oscillation`: tránh dao động qua lại
3. Chọn quỹ đạo điểm cao nhất → xuất cmd_vel

**Local Costmap** (config: `nav2_params.yaml:169-200`):
- Cửa sổ 3m × 3m quanh robot, cập nhật 5Hz (theo LiDAR)
- Phát hiện chướng ngại vật động (người đi ngang, đồ vật mới)

```
Ví dụ: DWB giống tài xế đang lái thực tế.
GPS (planner) bảo "rẽ phải 50m nữa", nhưng tài xế (controller)
phải xử lý xe đỗ bên đường, người qua đường — đó là local planning.
```

### 2.6 Behavior Server — Recovery khi bị kẹt

Config: `nav2_params.yaml:272-293`

Khi robot không tiến được (progress_checker timeout 10s):
1. **Spin** → quay tại chỗ, clear costmap cục bộ
2. **BackUp** → lùi lại 0.15m
3. **Wait** → đợi chướng ngại vật tự di chuyển
4. **DriveOnHeading** → thử đi thẳng hướng khác

### 2.7 EKF — Sensor Fusion

File: `src/slam_car_bringup/launch/robot.launch.py:117-126`

EKF (Extended Kalman Filter) kết hợp dữ liệu từ:
- Odometry (encoder) → vận tốc + quãng đường
- IMU → gia tốc + vận tốc góc

Output: `/odometry/filtered` — ước lượng vị trí chính xác hơn từng sensor riêng lẻ.

```
Ví dụ: Encoder nói "đi được 1m" nhưng bánh trượt. IMU nói "quay 30°".
EKF kết hợp: "OK, tin encoder 70% + IMU 30% → vị trí ước lượng tốt nhất."
```

---

## TẦNG 3: ESP32 Firmware (micro-ROS)

### 3.1 Kết nối micro-ROS

File: `firmware/src/ros_bridge.cpp`

ESP32 kết nối về ROS2 qua **micro-ROS agent** (UDP transport):

```
[ESP32 WiFi] ──UDP──→ [micro-ROS Agent on PC] ──DDS──→ [ROS2 Network]
                           port 8888
```

Quy trình khởi động:
1. Kết nối WiFi (SSID/password từ `.env`)
2. Ping micro-ROS agent cho đến khi tìm thấy
3. Tạo ROS2 node `slam_car_esp32` (domain ID: 42)
4. Đồng bộ thời gian (time sync) với agent
5. Đăng ký publishers: `/scan`, `/odom`, `/imu/data_raw`, `/joint_states`
6. Đăng ký subscribers: `/cmd_vel`, `/servo_cmd`
7. Tạo 2 timers: 50Hz (odom/IMU) + 5Hz (LiDAR scan)

### 3.2 Nhận lệnh cmd_vel

File: `firmware/src/ros_bridge.cpp:464-480`

Khi Nav2 controller publish `/cmd_vel`:

```
cmd_vel message arrives (Twist):
    │
    ├── safety_notify_cmd_vel()     ← reset watchdog timer
    │
    ├── safety_is_motion_allowed()? ← kiểm tra watchdog OK?
    │       │
    │       ├── YES → motors_apply_cmd_vel(linear.x, angular.z)
    │       └── NO  → bỏ qua (motors đã bị dừng bởi watchdog)
    │
    ▼
```

### 3.3 Safety Module — Watchdog

File: `firmware/src/safety.cpp`

```
Safety watchdog (bảo vệ robot):
├── CMD_VEL_TIMEOUT: nếu không nhận cmd_vel trong N ms → DỪNG motors
├── LIDAR_TIMEOUT: nếu LiDAR mất dữ liệu → pause scan publishing  
└── Agent disconnect: nếu mất kết nối agent → DỪNG motors ngay
```

Giống hệ thống "dead man's switch": nếu bộ não (Nav2) ngừng ra lệnh → robot dừng lại.

### 3.4 Differential Drive — Từ cmd_vel đến bánh xe

File: `firmware/src/motors.cpp:100-128`

Công thức chuyển (linear_x, angular_z) → tốc độ 2 bánh:

```
              ┌─────────────────────────────────────┐
              │  Differential Drive Kinematics      │
              │                                     │
              │  half_turn = angular_z × L / 2      │
              │  left_speed  = linear_x - half_turn │
              │  right_speed = linear_x + half_turn │
              │                                     │
              │  L = WHEEL_SEPARATION (khoảng cách  │
              │      giữa 2 bánh)                   │
              └─────────────────────────────────────┘

Ví dụ:
  cmd_vel = {linear: 0.2, angular: 0.5}
  → left  = 0.2 - 0.5*L/2 = chậm hơn
  → right = 0.2 + 0.5*L/2 = nhanh hơn
  → Robot quay trái (vì bánh phải nhanh hơn)

  cmd_vel = {linear: 0, angular: 1.0}
  → left  = -0.5*L/2 (lùi)
  → right = +0.5*L/2 (tiến)
  → Robot xoay tại chỗ
```

### 3.5 Motor Control — PWM Output

File: `firmware/src/motors.cpp:169-206`

Sau khi tính tốc độ mỗi bánh:

```
speed → pwm_from_speed() → PWM value (80-170)
                              │
                              ▼
              TB6612FNG Motor Driver
              ├── AIN1/AIN2: hướng motor trái
              ├── BIN1/BIN2: hướng motor phải
              ├── PWMA: tốc độ motor trái (LEDC 5kHz, 8-bit)
              └── PWMB: tốc độ motor phải (LEDC 5kHz, 8-bit)
```

Xử lý đặc biệt cho turning:
- PWM tối thiểu khi quay: **200** (để vượt ma sát tĩnh)
- PWM quay tại chỗ: **235** (cần lực lớn hơn)
- PWM chạy thẳng: **80-170**
- Deadband: bỏ qua nếu speed < 0.01 m/s

### 3.6 Feedback Loop — Odometry về ROS2

File: `firmware/src/ros_bridge.cpp:502-558`

ESP32 cũng publish dữ liệu ngược lên ROS2 (50Hz):

```
[Encoders] ──→ encoders_update_odometry() ──→ /odom (x, y, theta, vel)
[IMU]      ──→ imu_read()                 ──→ /imu/data_raw (accel, gyro)
[LiDAR]    ──→ lidar scan ready           ──→ /scan (LaserScan, 5Hz)
```

Dữ liệu này quay lại:
- **EKF** dùng odom + IMU → `/odometry/filtered`
- **AMCL** dùng scan + odom → transform map→odom
- **Costmaps** dùng scan → cập nhật vật cản
- **Controller** dùng odom → biết robot speed hiện tại

---

## TOÀN BỘ FLOW — Từ click đến bánh quay

```
Thời gian ──────────────────────────────────────────────────────────────→

[t=0]     User click bản đồ
              │
[t~5ms]   GoalSetter tạo PoseStamped, NavStore.sendGoal()
              │
[t~10ms]  roslibjs gửi JSON qua WebSocket → rosbridge
              │
[t~20ms]  rosbridge chuyển thành ROS2 Action Goal
              │
[t~30ms]  BT Navigator nhận goal, gọi ComputePathToPose
              │
[t~100ms] NavFn Planner tính A* path trên global costmap
              │
[t~110ms] BT Navigator gọi FollowPath (DWB controller)
              │
[t~200ms] DWB tính cmd_vel đầu tiên (10Hz loop bắt đầu)
              │
[t~210ms] cmd_vel publish lên topic
              │
[t~215ms] micro-ROS agent relay qua UDP đến ESP32
              │
[t~220ms] cmd_vel_callback → safety check → motors_apply_cmd_vel
              │
[t~221ms] TB6612FNG nhận PWM signal → bánh xe quay
              │
[t~240ms] Encoder tick → odometry update
              │
[t~260ms] ESP32 publish /odom (50Hz) → micro-ROS agent → ROS2
              │
[t~300ms] EKF fuse odom+IMU → /odometry/filtered
              │
[t~400ms] Controller đọc odometry mới, tính cmd_vel tiếp
              │
[...loop 10Hz cho đến khi goal reached...]
              │
[t=end]   GoalChecker: |pos - goal| < 0.15m && |yaw - target_yaw| < 0.25rad
              │
           BT Navigator gửi result → rosbridge → WebSocket → NavStore
              │
           UI hiển thị "Navigation complete"
```

---

## TÓM TẮT CÁC TOPIC/SERVICE QUAN TRỌNG

| Topic/Action              | Hướng              | Mô tả                                     |
|---------------------------|--------------------|--------------------------------------------|
| `/navigate_to_pose`       | Web → Nav2         | Action: gửi goal, nhận feedback/result     |
| `/cmd_vel`                | Nav2 → ESP32       | Lệnh vận tốc (Twist: linear + angular)    |
| `/scan`                   | ESP32 → Nav2       | LiDAR data (5Hz, 360°)                    |
| `/odom`                   | ESP32 → EKF        | Raw odometry từ encoders                   |
| `/imu/data_raw`           | ESP32 → EKF        | IMU accelerometer + gyroscope              |
| `/odometry/filtered`      | EKF → Nav2         | Fused odometry (chính xác hơn)            |
| `/map`                    | Map Server → Nav2  | Bản đồ tĩnh đã lưu                       |
| TF: `map→odom`            | AMCL → Nav2        | Định vị robot trên map                     |
| TF: `odom→base_footprint` | EKF → Nav2         | Vị trí robot trong odom frame             |

---

## FILE REFERENCES

| Layer    | File                                                  | Vai trò                              |
|----------|-------------------------------------------------------|--------------------------------------|
| Web      | `app/src/components/slam/goal-setter.tsx`              | UI click-to-navigate                 |
| Web      | `app/src/stores/nav-store.ts`                         | Action client state management       |
| Web      | `app/src/lib/ros-client/real-client.ts`               | roslibjs WebSocket connection         |
| Launch   | `src/slam_car_bringup/launch/navigation.launch.py`    | Launch navigation stack              |
| Launch   | `src/slam_car_bringup/launch/robot.launch.py`         | Launch robot hardware bridge         |
| Launch   | `src/slam_car_bringup/launch/dashboard.launch.py`     | Launch rosbridge + dashboard nodes   |
| Config   | `src/slam_car_bringup/config/nav2_params.yaml`        | Nav2 tuning parameters               |
| Firmware | `firmware/src/ros_bridge.cpp`                         | micro-ROS node, cmd_vel subscriber   |
| Firmware | `firmware/src/motors.cpp`                             | Differential drive, PWM control      |
| Firmware | `firmware/src/safety.cpp`                             | Watchdog, emergency stop             |
