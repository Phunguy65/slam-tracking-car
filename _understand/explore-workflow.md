# Explore Mode — Full Workflow

## Tổng quan

Explore Mode là chế độ robot **tự động khám phá môi trường chưa biết** bằng thuật toán frontier exploration. Robot tìm ranh giới giữa vùng đã biết và chưa biết (frontier), tự đi đến đó, lặp lại cho đến khi bản đồ hoàn chỉnh.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FULL WORKFLOW OVERVIEW                             │
│                                                                          │
│  [Web Dashboard]  ──WebSocket──▶  [rosbridge]  ──ROS2 topic──▶           │
│                                                                          │
│  [explore_lite]  ──NavigateToPose──▶  [Nav2]  ──/cmd_vel──▶              │
│                                                                          │
│  [micro-ROS Agent]  ──UDP──▶  [ESP32 Firmware]  ──PWM──▶  [Motors]       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Lớp 1: Web Dashboard (React/Next.js)

### 1.1 Người dùng bật Auto Explore

Trên giao diện web, trong SLAM mode > Mapping submode, có switch "Auto Explore".

**File:** `app/src/components/dashboard/mode-controller.tsx:143-164`

Khi user bật switch:

```
User toggle ON
     │
     ▼
handleAutoExploreToggle(true)
     │
     ▼
startExplore()  ← từ useExploreStore
     │
     ▼
publish('/explore/resume', 'std_msgs/Bool', { data: true })
```

Khi user tắt switch:

```
User toggle OFF
     │
     ▼
handleAutoExploreToggle(false)
     │
     ├──▶ stopExplore()   → publish('/explore/resume', { data: false })
     └──▶ cancelNav()     → cancel NavigateToPose action (dừng robot ngay)
```

### 1.2 Explore Store — Cầu nối với ROS2

**File:** `app/src/stores/explore-store.ts`

Store rất đơn giản — chỉ publish topic `std_msgs/Bool` lên `/explore/resume`:
- `sendGoal()` → publish `true` → explore_lite bắt đầu chạy
- `cancel()` → publish `false` → explore_lite dừng lại

### 1.3 Kết nối WebSocket (roslibjs)

**File:** `app/src/lib/ros-client/real-client.ts`

Web app kết nối qua WebSocket tới `rosbridge_websocket` (port 9090). Khi gọi `publish()`:

```
Browser  ──WebSocket ws://robot-ip:9090──▶  rosbridge_websocket
                                                    │
                                                    ▼
                                            ROS2 topic publish
                                            /explore/resume (Bool)
```

### 1.4 Feedback — Biết robot đang explore hay không

**File:** `app/src/components/dashboard/mode-controller.tsx:41-48`

Web app subscribe topic `/explore/status` (type `explore_lite_msgs/ExploreStatus`):

```
explore_lite node  ──publish /explore/status──▶  rosbridge  ──WebSocket──▶  Browser
                                                                                │
                                                                                ▼
                                                                     setAutoExplore(true/false)
                                                                     (cập nhật UI switch)
```

Các trạng thái:
- `exploration_started` — mới bật
- `exploration_in_progress` — đang khám phá
- `exploration_paused` — tạm dừng
- `exploration_complete` — hết frontier, xong
- `returning_to_origin` / `returned_to_origin` — đang/đã quay về gốc

---

## Lớp 2: ROS2 (Giải thuật)

### 2.1 Cách hệ thống khởi động

**File:** `src/slam_car_bringup/launch/dashboard.launch.py`

Khi launch, các node liên quan explore mode được khởi động:

```
dashboard.launch.py
     │
     ├── slam_toolbox (async)          ← Luôn chạy, tạo bản đồ /map
     │
     ├── explore_lite node             ← Thuật toán frontier exploration
     │        (bị pause ngay khi start)
     │
     ├── Nav2 lifecycle nodes          ← Điều hướng (controller, planner, bt_navigator)
     │        (autostart = True via explore_lifecycle_manager)
     │
     └── pause_explore_on_start        ← Timer 2s → pub false lên /explore/resume
                                          (đảm bảo robot không chạy ngay)
```

**Quan trọng:** Khi `use_explore=true`, một `explore_nav2_lifecycle_manager` riêng autostart các Nav2 node cần thiết (controller_server, planner_server, bt_navigator, behavior_server). Đây là Nav2 stack phục vụ riêng cho explore mode.

### 2.2 explore_lite — Thuật toán Frontier Exploration

**Package:** `explore_lite` (m-explore-ros2)

**Config trong launch file** (`dashboard.launch.py:169-188`):

```yaml
robot_base_frame: "base_footprint"
costmap_topic: "/map"                # Bản đồ từ SLAM Toolbox
costmap_updates_topic: "/map_updates"
planner_frequency: 0.33              # Tìm frontier mỗi 3 giây
progress_timeout: 45.0               # 45s không tiến triển → chọn frontier mới
potential_scale: 5.0                 # Ưu tiên frontier gần
orientation_scale: 0.0               # Không quan tâm hướng
gain_scale: 0.8                      # Cân bằng kích thước frontier
min_frontier_size: 0.35              # Bỏ qua frontier < 35cm
```

#### Thuật toán hoạt động (Frontier-Based Exploration):

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTIER EXPLORATION LOOP                      │
│                                                                   │
│   1. Đọc bản đồ /map từ SLAM Toolbox                            │
│      ┌─────────┐                                                  │
│      │ ░░███░░ │  ░ = chưa biết (unknown)                        │
│      │ ░░█.█░░ │  █ = vật cản (occupied)                         │
│      │ ░░...░░ │  . = trống (free)                               │
│      │ ░░░░░░░ │  * = FRONTIER (ranh giới free↔unknown)          │
│      └─────────┘                                                  │
│                                                                   │
│   2. Tìm tất cả frontier cells (xem chi tiết mục 2.2.1)          │
│      → Cell "free" mà có neighbor "unknown" = frontier            │
│                                                                   │
│   3. Nhóm frontier cells thành frontier groups                    │
│      → Loại bỏ nhóm < min_frontier_size (0.35m)                  │
│                                                                   │
│   4. Chấm điểm mỗi frontier (xem chi tiết mục 2.2.2)            │
│      score = gain_scale × size − potential_scale × cost           │
│              − orientation_scale × turn                            │
│                                                                   │
│   5. Chọn frontier có score cao nhất                              │
│      → Gửi NavigateToPose goal tới Nav2                           │
│                                                                   │
│   6. Chờ robot đến nơi (hoặc timeout 45s)                         │
│      → Quay lại bước 1                                            │
│                                                                   │
│   7. Nếu không còn frontier nào                                   │
│      → Publish status "exploration_complete"                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2.1 Frontier Detection — Cách tìm frontier

Thuật toán tìm frontier dùng BFS (Breadth-First Search) trên occupancy grid:

```
Bản đồ Occupancy Grid (mỗi ô = 1 pixel = 0.05m):
    Giá trị mỗi ô:
      0   = free (trống, robot đi được)
      100 = occupied (vật cản)
      -1  = unknown (chưa quét)

Bước 1: Duyệt BFS từ vị trí robot
    → Tìm tất cả cell "free" mà có ít nhất 1 neighbor 8-hướng là "unknown"
    → Đánh dấu cell đó là FRONTIER CELL

Bước 2: Nhóm các frontier cells liền kề thành FRONTIER GROUP
    → Dùng flood-fill / connected component trên các frontier cells
    → Mỗi nhóm liên thông = 1 frontier

Bước 3: Lọc bỏ frontier nhỏ
    → size(frontier) = số cells × resolution (0.05m)
    → Nếu size < min_frontier_size (0.35m) → bỏ qua
    → Lý do: frontier nhỏ thường là khe hẹp hoặc nhiễu bản đồ
```

Ví dụ minh họa trên grid:

```
    Col:  0 1 2 3 4 5 6 7 8 9
Row 0:    ? ? ? ? ? ? ? ? ? ?       ? = unknown (-1)
Row 1:    ? ? ? ? ? ? ? ? ? ?       . = free (0)
Row 2:    ? ? [F F F] ? ? ? ? ?     █ = occupied (100)
Row 3:    ? ? . . . ? ? ? ? ?       F = frontier cell
Row 4:    ? . . R . . ? ? ? ?       R = robot
Row 5:    ? . . . . . ? ? ? ?
Row 6:    ? █ █ █ . . ? ? ? ?
Row 7:    ? ? ? ? ? ? ? ? ? ?

→ Cells (2,2), (2,3), (2,4) là frontier vì:
  - Chúng = free (0)
  - Có neighbor phía trên = unknown (-1)
→ Chúng liền kề → thành 1 frontier group
→ Size = 3 cells × 0.05m = 0.15m → BỎ QUA (< 0.35m)
```

#### 2.2.2 Frontier Scoring — Công thức chấm điểm chi tiết

Mỗi frontier được chấm điểm theo công thức:

```
score(f) = gain_scale × size(f) − potential_scale × cost(f) − orientation_scale × turn(f)
```

**Ba thành phần:**

| Thành phần | Ý nghĩa | Cách tính | Config |
|-----------|----------|-----------|--------|
| `size(f)` | Kích thước frontier (m) | Tổng chiều dài các frontier cells liền kề | `gain_scale = 0.8` |
| `cost(f)` | Chi phí đi đến frontier | Khoảng cách đường đi trên costmap (Wavefront) | `potential_scale = 5.0` |
| `turn(f)` | Góc cần quay để hướng về frontier | `atan2(fy - ry, fx - rx) - robot_theta` | `orientation_scale = 0.0` |

**Giải thích từng thành phần:**

##### size(f) — "Frontier này hứa hẹn bao nhiêu thông tin mới?"

```
Frontier lớn (size = 2.0m):            Frontier nhỏ (size = 0.4m):
┌─────────────────┐                    ┌─────────────────┐
│ . . .[F F F F F]│ ? ?                │ . . . . . .[F F]│ ?
│ . . . . . . . . │ ? ?                │ . . . . . . . . │ ?
└─────────────────┘                    └─────────────────┘
→ Phía sau có NHIỀU vùng unknown       → Phía sau có ÍT vùng unknown
→ Score cao hơn                         → Score thấp hơn
```

Frontier lớn = nhiều ô unknown tiếp giáp = nhiều vùng chưa biết phía sau = ưu tiên cao.

##### cost(f) — "Đi đến đó tốn bao nhiêu?"

Chi phí được tính bằng **Wavefront propagation** (lan truyền sóng) trên costmap:

```
Wavefront từ vị trí robot (R):
┌─────────────────────────┐
│ 8  7  6  5  4  5  6  7 │
│ 7  6  5  4  3  4  5  6 │
│ 6  5  4  3  2  3  4  5 │
│ 5  4  3  2  1  2  3  4 │
│ 4  3  2  1  R  1  2  3 │     Mỗi ô = khoảng cách tối thiểu từ R
│ 5  4  3  2  1  2  3  4 │     (tính cả vòng tránh vật cản)
│ 6  5  █  █  █  █  3  4 │     █ = vật cản → sóng đi vòng
│ 7  6  7  8  9  █  4  5 │
└─────────────────────────┘

Frontier F1 tại ô (0,4): cost = 4
Frontier F2 tại ô (7,3): cost = 8

→ F1 gần hơn → cost thấp hơn → score cao hơn
```

Lưu ý: cost không phải khoảng cách Euclidean mà là **đường đi thực tế** (có tính vật cản).

##### turn(f) — "Cần quay bao nhiêu?"

```
orientation_scale = 0.0  (TRONG DỰ ÁN NÀY)

→ Thành phần turn KHÔNG ảnh hưởng score!
→ Lý do: Robot differential drive quay rất nhanh tại chỗ
→ Góc quay không phải bottleneck
```

Nếu `orientation_scale > 0`:
```
Robot hướng →
         ↗ Frontier A (cần quay 30°) → turn = 0.52 rad
         ←  Frontier B (cần quay 180°) → turn = 3.14 rad
→ A được ưu tiên hơn B
```

##### Ví dụ tính score cụ thể:

```
Cấu hình dự án:
    gain_scale       = 0.8
    potential_scale  = 5.0
    orientation_scale = 0.0

Giả sử có 3 frontier:

┌──────────────┬──────────┬──────────┬─────────────────────────────────┐
│   Frontier   │ size (m) │ cost (m) │ score = 0.8×size − 5.0×cost     │
├──────────────┼──────────┼──────────┼─────────────────────────────────┤
│ F1 (gần,nhỏ)│   0.5    │   1.0    │ 0.8×0.5 − 5.0×1.0 = −4.6      │
│ F2 (xa, lớn)│   3.0    │   4.0    │ 0.8×3.0 − 5.0×4.0 = −17.6     │
│ F3 (vừa)    │   1.5    │   1.5    │ 0.8×1.5 − 5.0×1.5 = −6.3      │
└──────────────┴──────────┴──────────┴─────────────────────────────────┘

Winner: F1 (score = −4.6, cao nhất)
→ Robot đi đến F1 dù nhỏ, vì GẦN hơn nhiều!
```

**Nhận xét:** Với `potential_scale = 5.0` cao hơn `gain_scale = 0.8`, hệ thống **ưu tiên frontier gần** hơn là frontier lớn. Đây là chiến lược "greedy local" — robot quét sạch vùng gần trước rồi mới mở rộng ra xa. Phù hợp với robot nhỏ di chuyển chậm (max 0.3 m/s).

#### 2.2.3 Progress Timeout & Blacklist

```
Tình huống: Robot bị kẹt hoặc frontier không thể đến được

Timeline:
    t=0s   : explore_lite gửi goal đến frontier F1
    t=10s  : robot di chuyển bình thường
    t=20s  : robot bị kẹt (Nav2 đang cố gắng recovery)
    ...
    t=45s  : TIMEOUT! (progress_timeout = 45.0s)
             │
             ▼
    explore_lite đánh dấu F1 vào BLACKLIST
             │
             ▼
    Chọn frontier tiếp theo (F2, F3, ...) bỏ qua F1
             │
             ▼
    Gửi goal mới đến Nav2
```

Blacklist ngăn robot lặp vô hạn khi:
- Frontier nằm sau vật cản mà Nav2 không tìm được đường
- Path quá dài và robot di chuyển quá chậm
- Nav2 recovery behaviors thất bại

#### 2.2.4 Planner Frequency — Tần suất re-evaluate

```
planner_frequency = 0.33 Hz (mỗi 3 giây)

t=0s: Chọn F1 (score cao nhất lúc đó)
      Robot bắt đầu đi → bản đồ cập nhật
      
t=3s: Re-evaluate:
      - F1 vẫn tồn tại? Vẫn score cao nhất?
      - Có frontier MỚI xuất hiện (do bản đồ mở rộng)?
      - Nếu frontier mới score > F1 → HỦY goal cũ, gửi goal mới

t=6s: Re-evaluate lại...
```

Điều này cho phép robot **phản ứng linh hoạt** khi bản đồ thay đổi, thay vì đi đến frontier đã không còn tồn tại.

### 2.3 SLAM Toolbox — Xây dựng bản đồ

Node `slam_toolbox` (async mode) chạy liên tục:

```
/scan (LaserScan) ──▶  slam_toolbox  ──▶ /map (OccupancyGrid)
/odom (Odometry)  ──┘                    /map_updates
                                         /tf (map → odom)
```

- Nhận data LiDAR + odometry
- Dùng particle filter để ước lượng vị trí robot
- Cập nhật bản đồ occupancy grid liên tục
- Publish `/map` cho explore_lite đọc

### 2.4 Nav2 — Điều hướng robot đến frontier

Khi explore_lite gửi `NavigateToPose` goal:

```
explore_lite
     │
     │  NavigateToPose action goal
     │  (x=3.0, y=2.0, theta=0)
     ▼
bt_navigator (Behavior Tree)
     │
     │  Lập kế hoạch đường đi
     ▼
planner_server (NavFn / Dijkstra / A*)
     │
     │  Path (danh sách waypoints)
     ▼
controller_server (DWB / Regulated Pure Pursuit)
     │
     │  Tính toán velocity commands
     ▼
/cmd_vel (geometry_msgs/Twist)
     │
     │  linear.x = tốc độ tiến/lùi (m/s)
     │  angular.z = tốc độ xoay (rad/s)
     ▼
[Firmware nhận qua micro-ROS]
```

Nav2 cũng có `behavior_server` xử lý khi robot bị kẹt:
- **Spin** — xoay tại chỗ
- **Back up** — lùi lại
- **Wait** — đợi vật cản di chuyển

### 2.5 Chuỗi Topic/Service hoàn chỉnh

```
/explore/resume (Bool)              ← Web dashboard điều khiển
         │
         ▼
    explore_lite
         │
         ├──▶ subscribe /map         ← Đọc bản đồ từ SLAM
         ├──▶ publish /explore/status ← Trạng thái cho dashboard
         │
         │   [Tìm frontier, chọn mục tiêu]
         │
         └──▶ NavigateToPose action  ← Gửi goal cho Nav2
                    │
                    ▼
              Nav2 stack
                    │
                    └──▶ /cmd_vel    ← Velocity commands cho firmware
```

---

## Lớp 3: Firmware (ESP32 + micro-ROS)

### 3.1 Kiến trúc firmware

**File:** `firmware/src/main.cpp`

```
ESP32 Main Board
     │
     ├── WiFi → micro-ROS Agent (UDP) → ROS2 network
     │
     ├── Publishers:
     │   ├── /scan         (LaserScan)   ← LiDAR LDS02RR, 5 Hz
     │   ├── /odom         (Odometry)    ← Wheel encoders, 50 Hz
     │   ├── /imu/data_raw (Imu)         ← MPU6050, 50 Hz
     │   └── /joint_states (JointState)  ← Servo position, 50 Hz
     │
     └── Subscribers:
         ├── /cmd_vel    (Twist)         ← Motor commands TỪ Nav2
         └── /servo_cmd  (JointState)    ← Servo commands
```

### 3.2 Nhận /cmd_vel → Điều khiển motor

**File:** `firmware/src/ros_bridge.cpp:464-480`

Khi Nav2 publish `/cmd_vel`:

```
Nav2 controller_server
     │
     │  /cmd_vel: { linear.x: 0.2, angular.z: 0.5 }
     │
     ▼
micro-ROS Agent (PC/Raspberry Pi)
     │
     │  UDP transport
     ▼
ESP32 micro-ROS subscriber
     │
     │  cmd_vel_callback()
     ▼
safety_is_motion_allowed() ?
     │
     │  YES
     ▼
motors_apply_cmd_vel(0.2, 0.5)
```

### 3.3 Differential Drive — Tính toán tốc độ bánh xe

**File:** `firmware/src/motors.cpp:100-128`

Robot dùng **differential drive** (2 bánh độc lập):

```
        angular.z (rad/s)
             │
    ┌────────┴────────┐
    │  linear.x (m/s) │
    │                  │
    │   ┌──┐    ┌──┐  │
    │   │L │    │R │  │     L = left wheel
    │   │  │    │  │  │     R = right wheel
    │   └──┘    └──┘  │
    │                  │
    └──────────────────┘
        WHEEL_SEPARATION = 0.12m

Công thức:
    left_speed  = linear.x − angular.z × WHEEL_SEPARATION / 2
    right_speed = linear.x + angular.z × WHEEL_SEPARATION / 2

Ví dụ: linear.x=0.2, angular.z=0.5 (rẽ trái)
    left  = 0.2 − 0.5 × 0.06 = 0.17 m/s  (chậm hơn)
    right = 0.2 + 0.5 × 0.06 = 0.23 m/s  (nhanh hơn)
    → Robot cong sang trái
```

Sau đó tốc độ được chuyển thành giá trị PWM (0-255) để điều khiển TB6612FNG motor driver.

### 3.4 Encoder Odometry — Robot biết nó đang ở đâu

**File:** `firmware/src/encoders.cpp:61-105`

Mỗi 20ms (50 Hz), ESP32 đọc encoder ticks và tính:

```
Wheel Encoders (20 PPR)
     │
     │  interrupt count ticks
     ▼
delta_left  = left_ticks  × TICKS_TO_METERS
delta_right = right_ticks × TICKS_TO_METERS

    TICKS_TO_METERS = 2π × WHEEL_RADIUS / ENCODER_PPR
                    = 2π × 0.033 / 20
                    ≈ 0.0104 m/tick

Differential drive kinematics:
    delta_s     = (delta_left + delta_right) / 2     ← khoảng cách đi được
    delta_theta = (delta_right - delta_left) / WHEEL_SEPARATION  ← góc xoay

    x     += delta_s × cos(theta + delta_theta/2)
    y     += delta_s × sin(theta + delta_theta/2)
    theta += delta_theta
```

Data odometry được publish lên `/odom` → SLAM Toolbox dùng kết hợp với LiDAR để xây bản đồ chính xác.

### 3.5 LiDAR — Mắt thần của robot

**File:** `firmware/src/lidar.cpp`

LDS02RR quay 360°, 5 Hz, 360 points/vòng:

```
LDS02RR LiDAR (quay liên tục)
     │
     │  UART serial data
     ▼
kaiaai/LDS driver (parse protocol)
     │
     │  angle_deg, distance_mm, quality
     ▼
scan_ranges[360] buffer
     │
     │  Mỗi 200ms (scan_timer_5hz)
     ▼
/scan (LaserScan) publish
     │
     ▼
SLAM Toolbox (xây bản đồ)
```

### 3.6 Safety Module — Bảo vệ robot

**File:** `firmware/src/safety.cpp` (inferred from `config.h:163-164`)

```
CMD_VEL_TIMEOUT_MS = 1000ms    ← Nếu 1s không nhận cmd_vel → dừng motor
LIDAR_TIMEOUT_MS = 2000ms      ← Nếu 2s không có LiDAR data → dừng motor
AGENT_PING_INTERVAL_MS = 2000  ← Mỗi 2s ping agent, 3 lần fail → disconnect
```

---

## Vòng lặp hoàn chỉnh — Một chu kỳ explore

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MỘT CHU KỲ EXPLORE HOÀN CHỈNH                      │
│                                                                          │
│  ① User bật "Auto Explore" trên web                                     │
│     └─▶ publish /explore/resume = true                                   │
│                                                                          │
│  ② explore_lite nhận resume, bắt đầu loop:                              │
│     └─▶ Đọc /map từ SLAM Toolbox                                        │
│     └─▶ Tìm frontier (ranh giới known ↔ unknown)                        │
│     └─▶ Chấm điểm → chọn frontier tốt nhất                             │
│     └─▶ Gửi NavigateToPose goal (x, y) tới Nav2                         │
│                                                                          │
│  ③ Nav2 lập đường đi:                                                    │
│     └─▶ planner_server: A* path planning                                │
│     └─▶ controller_server: theo path, publish /cmd_vel                   │
│                                                                          │
│  ④ cmd_vel đến ESP32:                                                    │
│     └─▶ micro-ROS Agent → UDP → ESP32                                    │
│     └─▶ motors_apply_cmd_vel() → PWM → TB6612FNG → bánh xe quay          │
│                                                                          │
│  ⑤ Robot di chuyển, sensor feedback:                                     │
│     └─▶ Encoders → /odom (50 Hz) → SLAM Toolbox                         │
│     └─▶ LiDAR → /scan (5 Hz) → SLAM Toolbox                             │
│     └─▶ SLAM Toolbox cập nhật /map                                       │
│                                                                          │
│  ⑥ Bản đồ mở rộng → frontier cũ biến mất, frontier mới xuất hiện        │
│     └─▶ explore_lite chọn frontier mới → quay lại bước ③                 │
│                                                                          │
│  ⑦ Khi hết frontier (toàn bộ không gian đã biết):                        │
│     └─▶ explore_lite publish status = "exploration_complete"              │
│     └─▶ Web dashboard cập nhật UI (switch tắt)                           │
│                                                                          │
│  ⑧ User tắt switch hoặc exploration tự hoàn thành                        │
│     └─▶ publish /explore/resume = false                                   │
│     └─▶ Nav2 goal bị cancel → robot dừng                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sơ đồ kết nối vật lý

```
┌────────────────────────┐     WiFi/UDP      ┌───────────────────────┐
│      ESP32 Main        │◀────────────────▶│   PC / Raspberry Pi    │
│                        │                   │                        │
│  • LDS02RR (UART)      │                   │  • micro-ROS Agent     │
│  • TB6612FNG (GPIO)    │                   │  • ROS2 nodes          │
│  • Encoders (ISR)      │                   │  • rosbridge_websocket │
│  • MPU6050 (I2C)       │                   │  • SLAM Toolbox        │
│  • Servo pan (PWM)     │                   │  • Nav2 stack          │
│                        │                   │  • explore_lite        │
└────────────────────────┘                   └───────────┬────────────┘
                                                         │
                                                   WebSocket :9090
                                                         │
                                                         ▼
                                             ┌────────────────────────┐
                                             │    Web Browser          │
                                             │    (React Dashboard)    │
                                             └────────────────────────┘
```

---

## Tóm tắt các file chính

| Layer | File | Vai trò |
|-------|------|---------|
| Web | `app/src/stores/explore-store.ts` | Publish /explore/resume |
| Web | `app/src/components/dashboard/mode-controller.tsx` | UI toggle + status |
| Web | `app/src/lib/ros-client/real-client.ts` | WebSocket connection |
| ROS2 | `src/slam_car_bringup/launch/dashboard.launch.py` | Launch tất cả nodes |
| ROS2 | `src/slam_car_navigation/.../map_manager_node.py` | Mode switching |
| Firmware | `firmware/src/ros_bridge.cpp` | micro-ROS + cmd_vel handling |
| Firmware | `firmware/src/motors.cpp` | Differential drive control |
| Firmware | `firmware/src/encoders.cpp` | Wheel odometry |
| Firmware | `firmware/src/lidar.cpp` | LDS02RR scan data |
