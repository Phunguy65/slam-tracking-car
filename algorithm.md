# Báo cáo Giải thuật — SLAM Tracking Car

## Mục lục

1. [Khám phá bản đồ (Map Exploration)](#1-khám-phá-bản-đồ-map-exploration)
2. [Điều hướng đến điểm bất kỳ (Navigation)](#2-điều-hướng-đến-điểm-bất-kỳ-navigation)
3. [Theo dõi người (Person Tracking)](#3-theo-dõi-người-person-tracking)

---

## 1. Khám phá bản đồ (Map Exploration)

Hệ thống khám phá bản đồ gồm 2 thành phần phối hợp: **SLAM Toolbox** xây dựng bản đồ từ dữ liệu LiDAR, và **explore_lite** điều khiển robot tự động di chuyển đến các vùng chưa khám phá.

### 1.1 SLAM Toolbox — Xây dựng bản đồ

#### 1.1.1 Tổng quan

SLAM Toolbox sử dụng thuật toán **Graph-based SLAM** với chế độ `async_slam_toolbox_node` (mapping bất đồng bộ). Node này nhận dữ liệu từ LiDAR LDS02RR (5 Hz, 360 điểm/vòng quét, tầm xa 6m) và odometry, sau đó xây dựng đồ thị tư thế (pose graph) biểu diễn quỹ đạo robot.

#### 1.1.2 Nguyên lý hoạt động

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  LiDAR Scan │────▶│  Scan Matching   │────▶│  Pose Graph     │
│  (/scan)    │     │  (tìm vị trí    │     │  (đồ thị tư    │
│             │     │   tương đối)     │     │   thế robot)    │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
┌─────────────┐     ┌──────────────────┐              │
│  Bản đồ     │◀────│  Loop Closure    │◀─────────────┘
│  Occupancy  │     │  (phát hiện vòng │
│  Grid (/map)│     │   lặp, tối ưu)  │
└─────────────┘     └──────────────────┘
```

#### 1.1.3 Scan Matching

Scan matching là quá trình ước lượng phép biến đổi (translation + rotation) giữa 2 bản quét LiDAR liên tiếp. Hệ thống sử dụng **correlative scan matching** kết hợp với **Ceres Solver** để tối ưu phi tuyến.

##### Correlative Scan Matching là gì?

Correlative scan matching (so khớp quét tương quan) là phương pháp tìm vị trí tương đối giữa 2 bản quét LiDAR bằng cách "trượt" bản quét mới lên bản đồ xác suất và đo mức độ trùng khớp tại mỗi vị trí.

Ý tưởng cốt lõi giống như dịch chuyển một tấm kính có các chấm đen (bản quét mới) trên một bức ảnh (bản đồ) — vị trí mà nhiều chấm đen nhất trùng với vật cản trên ảnh chính là vị trí thực của robot.

Quy trình chi tiết:

```
┌───────────────────────────────────────────────────────────────┐
│ Bước 1: Xây dựng bản đồ xác suất (Probability Grid)          │
│   - Mỗi ô trên lưới chứa xác suất có vật cản [0.0 → 1.0]   │
│   - Dựng từ scan tham chiếu (scan trước đó)                  │
│   - Áp dụng Gaussian blur để tạo "vùng hấp dẫn" quanh       │
│     vật cản → giúp tối ưu dễ hội tụ hơn                      │
├───────────────────────────────────────────────────────────────┤
│ Bước 2: Quét thô (Coarse Search)                             │
│   - Thử tất cả phép biến đổi T = (dx, dy, dθ) trong một     │
│     lưới thô (ví dụ: bước 5cm, 2°)                          │
│   - Với mỗi T, chiếu tất cả điểm scan mới qua T             │
│   - Tính tổng xác suất tại các vị trí chiếu trên bản đồ     │
│   - Chọn T cho tổng xác suất cao nhất                        │
├───────────────────────────────────────────────────────────────┤
│ Bước 3: Tối ưu tinh (Fine Optimization) — Ceres Solver       │
│   - Lấy kết quả thô làm điểm khởi đầu                       │
│   - Chạy Levenberg-Marquardt để tinh chỉnh T                 │
│   - Hội tụ đến vị trí chính xác sub-pixel                    │
└───────────────────────────────────────────────────────────────┘
```

So sánh với các phương pháp khác:
- **ICP (Iterative Closest Point)**: Tìm cặp điểm gần nhất rồi tối ưu — dễ rơi vào cực tiểu địa phương (local minimum) khi khởi tạo xa nghiệm
- **Correlative scan matching**: Quét toàn bộ không gian tìm kiếm trước → tránh được cực tiểu địa phương, nhưng tốn tính toán hơn

Hàm chi phí cần tối thiểu hóa (ở bước tối ưu tinh):

```
E(T) = Σᵢ [1 - M(T · pᵢ)]²
```

Trong đó:
- `T` = phép biến đổi cần tìm (dx, dy, dθ)
- `pᵢ` = điểm thứ i trong bản quét hiện tại
- `M(x)` = giá trị xác suất tại vị trí x trên bản đồ (0 = trống, 1 = vật cản)
- `T · pᵢ` = vị trí mới của điểm pᵢ sau khi áp dụng phép biến đổi T

Ý nghĩa: Khi T chính xác, mỗi điểm pᵢ (vật cản từ scan mới) sẽ rơi đúng vào vị trí có `M = 1` (vật cản trên bản đồ), khiến `[1 - M(...)]² = 0`. Tổng E(T) → 0 khi alignment hoàn hảo.

**Ceres Solver** giải bài toán tối ưu phi tuyến này với cấu hình:

```yaml
solver_plugin: solver_plugins::CeresSolver
ceres_linear_solver: SPARSE_NORMAL_CHOLESKY
ceres_preconditioner: SCHUR_JACOBI
ceres_trust_strategy: LEVENBERG_MARQUARDT
```

- **SPARSE_NORMAL_CHOLESKY**: Giải hệ phương trình tuyến tính thưa (sparse) bằng phân tích Cholesky — phù hợp với bài toán SLAM vì ma trận Hessian có cấu trúc thưa
- **SCHUR_JACOBI**: Tiền xử lý (preconditioner) dựa trên complement Schur — tăng tốc hội tụ
- **LEVENBERG_MARQUARDT**: Chiến lược trust-region kết hợp Gauss-Newton và gradient descent — ổn định khi xa nghiệm, nhanh khi gần nghiệm

##### Phép biến đổi T — Giải thích trực quan

Phép biến đổi `T = (dx, dy, dθ)` trả lời câu hỏi: *"Robot đã dịch chuyển bao xa và xoay bao nhiêu giữa 2 lần quét LiDAR?"*

```
        Scan cũ (t-1)              Scan mới (t)

          ·  ·                       ·  ·
         ·    ·                     ·    ·
        · Robot·                   · Robot·
         ·    ·                     ·    ·
          ·  ·                       ·  ·
           |                           |
           └───── T = (dx, dy, dθ) ────┘
                  dịch 5cm sang phải
                  dịch 3cm về trước
                  xoay 2° theo chiều kim đồng hồ
```

T là phép biến đổi cứng (rigid body transformation) trong mặt phẳng 2D. Khi áp dụng T lên một điểm `p = (px, py)` từ scan mới, ta được vị trí tương ứng trên bản đồ:

```
Ma trận biến đổi T áp dụng lên điểm p = (px, py):

    ┌ px' ┐   ┌ cos(dθ)  -sin(dθ)  dx ┐   ┌ px ┐
    │ py' │ = │ sin(dθ)   cos(dθ)  dy │ × │ py │
    └  1  ┘   └    0         0      1 ┘   └  1 ┘

    (vị trí       (ma trận xoay + dịch)     (vị trí
     trên                                    trong
     bản đồ)                                 scan mới)
```

Ví dụ cụ thể: Nếu T = (10cm, 0cm, 5°) và điểm laser p = (1m, 0m):
- Xoay p quanh gốc tọa độ 5° → p trở thành (0.996m, 0.087m)
- Dịch thêm (10cm, 0cm) → kết quả cuối: (1.096m, 0.087m)

##### Ví dụ minh họa toàn bộ Scan Matching Flow

```
Thời điểm t:   Robot ở vị trí A, quét được scan A (tham chiếu)
Thời điểm t+1: Robot dịch chuyển, quét được scan B (mới)

     Scan A (tham chiếu)           Scan B (mới)

     ████                              ████
     █  █    tường                     █  █
     █  █                              █  █
     ████                              ████
       ↑                                 ↑
     Robot A                           Robot B
     (0,0,0°)                          (?,?,?°) ← cần tìm T

─────────────────────────────────────────────────────────────────
BƯỚC 1: Biến scan A thành bản đồ xác suất (+ Gaussian blur)

     Lưới xác suất (mỗi ô = xác suất có vật cản):

     0.0  0.0  0.2  0.5  0.2  0.0  0.0
     0.0  0.2  0.7 [1.0] 0.7  0.2  0.0   ← [1.0] = tường thực
     0.0  0.2  0.7 [1.0] 0.7  0.2  0.0   ← blur tạo "vùng hấp dẫn"
     0.0  0.0  0.2  0.5  0.2  0.0  0.0      xung quanh vật cản

     Tác dụng blur: khi scan B "gần đúng" vị trí, các điểm vẫn
     nhận được xác suất > 0, giúp tối ưu hóa "trượt" được đến
     đúng nơi thay vì bị kẹt ở điểm sai.

─────────────────────────────────────────────────────────────────
BƯỚC 2: Quét thô — thử TỪNG vị trí đặt scan B (brute force)

     Thử T₁ = ( 0cm, 0cm, 0°): điểm rơi vào ô 0.1, 0.0, 0.2
                                 → Tổng = 0.3  ✗

     Thử T₂ = ( 5cm, 0cm, 0°): điểm rơi vào ô 0.5, 0.2, 0.7
                                 → Tổng = 1.4

     Thử T₃ = (10cm, 0cm, 0°): điểm rơi vào ô 1.0, 0.7, 1.0
                                 → Tổng = 2.7  ★ CAO NHẤT

     Thử T₄ = (15cm, 0cm, 0°): điểm rơi vào ô 0.5, 0.2, 0.7
                                 → Tổng = 1.4  ✗
     ... (thử tiếp với dy, dθ khác nhau)

     → Kết quả thô: T ≈ (10cm, 0cm, 0°), chính xác ±5cm, ±2°

─────────────────────────────────────────────────────────────────
BƯỚC 3: Ceres Solver tinh chỉnh từ kết quả thô

     Bắt đầu: T = (10.0cm, 0.0cm, 0.00°)    E = 0.25

     Vòng 1:  Tính gradient → dịch T theo hướng giảm lỗi
              T = (10.2cm, 0.1cm, 0.30°)      E = 0.08

     Vòng 2:  Tiếp tục
              T = (10.3cm, 0.15cm, 0.28°)     E = 0.01

     Vòng 3:  Gần hội tụ
              T = (10.31cm, 0.14cm, 0.29°)    E = 0.001

     → Dừng! Kết quả: robot dịch 10.31cm, lệch 0.14cm, xoay 0.29°
```

##### Tại sao kết hợp Correlative + Ceres thay vì dùng riêng?

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  CHỈ DÙNG CORRELATIVE (brute force):                            │
│  ✓ Không bao giờ bị local minimum (xét hết mọi khả năng)       │
│  ✗ Chậm nếu muốn lưới mịn (0.1mm, 0.01°)                     │
│  ✗ Kết quả thô (±5cm, ±2°) — không đủ cho SLAM chất lượng     │
│                                                                 │
│  CHỈ DÙNG CERES (gradient descent):                             │
│  ✓ Kết quả cực kỳ chính xác (sub-mm, sub-degree)               │
│  ✗ Cần điểm khởi đầu tốt                                       │
│  ✗ Dễ rơi vào local minimum nếu khởi đầu sai                   │
│                                                                 │
│     Hàm lỗi E(T) có thể trông như thế này:                     │
│                                                                 │
│     E │  *           *                                          │
│       │ * *         * *    ← local minimum (bẫy!)               │
│       │*   *   *   *   *                                        │
│       │     * * * *        ← GLOBAL minimum (đáp án đúng)       │
│       └──────────────────── T                                   │
│                                                                 │
│     Nếu khởi đầu ở bên trái → Ceres trượt vào bẫy local min   │
│     Correlative quét hết → tìm được vùng global min trước       │
│                                                                 │
│  KẾT HỢP CẢ HAI = BEST OF BOTH WORLDS:                         │
│  1. Correlative tìm vùng đúng (lưới thô, nhanh, an toàn)       │
│  2. Ceres tinh chỉnh trong vùng đó (chính xác tuyệt đối)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Levenberg-Marquardt — Tại sao chọn chiến lược này?

Levenberg-Marquardt (LM) là thuật toán tối ưu kết hợp 2 phương pháp:

```
                    Khi XA nghiệm              Khi GẦN nghiệm
                    ─────────────              ───────────────
Gradient Descent:   Bước lớn, nhanh            Bước lớn → dao động qua lại
Gauss-Newton:       Không ổn định              Bước nhỏ, chính xác, hội tụ nhanh

LM (kết hợp):      Dùng Gradient Descent       Tự chuyển sang Gauss-Newton
                    (an toàn, ổn định)          (chính xác, hội tụ mượt)

So sánh hành vi hội tụ:

  Gradient Descent thuần:        Levenberg-Marquardt:

       ╲    ╱                          ╲
        ╲  ╱   ← dao động               ──╲──── ← hội tụ mượt mà
         ╳                                  ╲___● (nghiệm)
        ╱ ╲
```

LM tự điều chỉnh thông qua tham số damping (λ):
- λ lớn → hành vi giống gradient descent (bước nhỏ, an toàn)
- λ nhỏ → hành vi giống Gauss-Newton (bước lớn, chính xác)
- Nếu bước hiện tại giảm lỗi → giảm λ (tin tưởng hơn)
- Nếu bước hiện tại tăng lỗi → tăng λ (thận trọng hơn)

#### 1.1.4 Điều kiện kích hoạt scan matching

Để tránh xử lý thừa, scan matching chỉ kích hoạt khi robot di chuyển đủ xa:

```yaml
minimum_travel_distance: 0.1   # ít nhất 10cm
minimum_travel_heading: 0.1    # ít nhất 0.1 rad (~5.7°)
minimum_time_interval: 0.2     # không xử lý nhanh hơn 5 Hz
```

#### 1.1.5 Loop Closure (Đóng vòng lặp)

Khi robot quay lại vùng đã khám phá, thuật toán loop closure phát hiện sự trùng lặp và hiệu chỉnh sai số tích lũy.

Quá trình:
1. Robot thu thập chuỗi scan mới
2. So khớp với các scan cũ trong pose graph (chain matching)
3. Nếu điểm matching vượt ngưỡng → thêm constraint vào đồ thị
4. Chạy tối ưu toàn cục (global optimization) để phân bố sai số

```yaml
do_loop_closing: true
loop_match_minimum_chain_size: 10       # cần ít nhất 10 scan liên tiếp khớp
loop_match_maximum_variance_coarse: 3.0 # ngưỡng variance cho matching thô
loop_match_minimum_response_coarse: 0.35 # điểm matching tối thiểu (thô)
loop_match_minimum_response_fine: 0.45   # điểm matching tối thiểu (tinh)
```

Quy trình 2 giai đoạn:
- **Coarse matching** (thô): Quét nhanh với dung sai lớn (variance ≤ 3.0, response ≥ 0.35)
- **Fine matching** (tinh): Xác nhận chính xác (response ≥ 0.45)

#### 1.1.6 Tạo Occupancy Grid Map

Bản đồ đầu ra là lưới xác suất (occupancy grid) với:
- Độ phân giải: 0.05m/pixel
- Mỗi ô chứa xác suất chiếm đóng: 0 (trống) → 100 (vật cản), -1 (chưa biết)
- Cập nhật mỗi 5 giây (`map_update_interval: 5.0`)

---

### 1.2 Frontier-based Exploration (explore_lite)

#### 1.2.1 Tổng quan

`explore_lite` thực hiện thuật toán **frontier-based exploration** — robot tự động tìm và di chuyển đến các "frontier" (biên giới giữa vùng đã biết và chưa biết) để khám phá toàn bộ môi trường.

#### 1.2.2 Định nghĩa Frontier

Frontier là tập hợp các ô trống (free) trên bản đồ mà tiếp giáp với ít nhất một ô chưa biết (unknown). Nói cách khác, frontier là ranh giới giữa vùng đã quét và vùng chưa quét.

```
┌───────────────────────────┐
│ ░░░░░░░░░░░░ ? ? ? ? ? ? │
│ ░░░░░░░░░░░░ ? ? ? ? ? ? │
│ ░░░░░░ R ░░░[F F F]? ? ? │  ← [F] = Frontier cells
│ ░░░░░░░░░░░░ ? ? ? ? ? ? │  ← ░ = Free (đã quét)
│ ░░░░░░░░░░░░ ? ? ? ? ? ? │  ← ? = Unknown (chưa quét)
│ ████████████ ? ? ? ? ? ? │  ← █ = Obstacle (vật cản)
└───────────────────────────┘
```

#### 1.2.3 Thuật toán chọn Frontier

Hàm đánh giá frontier kết hợp 3 yếu tố:

```
score(f) = gain_scale × size(f) − potential_scale × cost(f) − orientation_scale × turn(f)
```

Trong đó:
- `size(f)` = kích thước frontier (số ô), ưu tiên frontier lớn hơn (nhiều thông tin mới)
- `cost(f)` = chi phí di chuyển từ robot đến frontier (dựa trên costmap)
- `turn(f)` = góc quay cần thiết để hướng về frontier

Cấu hình trong dự án:

```yaml
gain_scale: 0.8          # Trọng số kích thước frontier
potential_scale: 5.0      # Trọng số chi phí di chuyển (cao → ưu tiên frontier gần)
orientation_scale: 0.0    # Không tính góc quay (robot differential drive quay nhanh)
min_frontier_size: 0.35   # Bỏ qua frontier nhỏ hơn 0.35m (tránh khe hẹp)
```

#### 1.2.4 Chu trình khám phá

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│ Quét bản │────▶│ Tìm tất cả  │────▶│ Chấm điểm    │────▶│ Gửi goal │
│ đồ hiện  │     │ frontier     │     │ và chọn tốt  │     │ đến Nav2 │
│ tại      │     │ (BFS/DFS)   │     │ nhất          │     │          │
└──────────┘     └──────────────┘     └───────────────┘     └─────┬────┘
      ▲                                                            │
      │          ┌──────────────┐                                  │
      └──────────│ Robot di     │◀─────────────────────────────────┘
                 │ chuyển đến   │
                 │ frontier     │
                 └──────────────┘
```

Tần suất lặp: `planner_frequency: 0.33` (mỗi 3 giây đánh giá lại frontier).

Nếu robot không tiến triển trong `progress_timeout: 45.0` giây → đánh dấu frontier hiện tại là blacklist và chọn frontier khác.

#### 1.2.5 Cơ chế điều khiển từ Dashboard

Hệ thống cho phép tạm dừng/tiếp tục khám phá qua topic `/explore/resume`:

```typescript
// app/src/stores/explore-store.ts
function publishResume(data: boolean) {
    publish('/explore/resume', 'std_msgs/Bool', { data });
}
```

- `true` → tiếp tục khám phá
- `false` → tạm dừng (robot dừng tại chỗ)

Mặc định khi khởi động, exploration bị tạm dừng (`{data: false}`) sau 2 giây để đợi hệ thống ổn định.

---

### 1.3 Phối hợp giữa SLAM Toolbox và explore_lite

```
┌─────────┐  /scan   ┌──────────────┐  /map   ┌─────────────┐
│  LiDAR  │─────────▶│ SLAM Toolbox │────────▶│ explore_lite│
│ LDS02RR │          │ (tạo bản đồ) │         │ (tìm frontier)
└─────────┘          └──────────────┘         └──────┬──────┘
                                                      │ goal
                                                      ▼
┌─────────┐  /cmd_vel ┌──────────────┐  action  ┌─────────────┐
│  Motor  │◀──────────│ Nav2 Stack   │◀──────────│ NavigateTo  │
│ Driver  │           │ (path plan)  │           │ Pose        │
└─────────┘           └──────────────┘           └─────────────┘
```

Luồng dữ liệu:
1. LiDAR quét môi trường → SLAM Toolbox tạo/cập nhật bản đồ
2. explore_lite đọc bản đồ → tìm frontier → gửi goal pose đến Nav2
3. Nav2 lập đường đi → controller gửi `/cmd_vel` đến motor driver
4. Robot di chuyển → LiDAR quét vùng mới → vòng lặp tiếp tục

Điều kiện dừng: Không còn frontier nào có kích thước ≥ `min_frontier_size` (0.35m) → toàn bộ môi trường đã được khám phá.

---

## 2. Điều hướng đến điểm bất kỳ (Navigation)

Khi bản đồ đã được tạo (từ bước khám phá), robot có thể di chuyển đến bất kỳ điểm nào trên bản đồ. Hệ thống sử dụng **Nav2 Stack** với kiến trúc phân tầng.

### 2.1 Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                    BT Navigator                              │
│  (Behavior Tree điều phối toàn bộ quá trình navigation)     │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌─────────────┐ ┌──────────────┐
│  Planner Server  │ │ Controller  │ │  Behavior    │
│  (lập đường đi   │ │ Server      │ │  Server      │
│   toàn cục)      │ │ (bám đường) │ │  (recovery)  │
└────────┬─────────┘ └──────┬──────┘ └──────┬───────┘
         │                   │               │
         ▼                   ▼               ▼
┌──────────────────┐ ┌─────────────┐ ┌──────────────┐
│  Global Costmap  │ │ Local       │ │ Spin/Backup/ │
│  (static + obs)  │ │ Costmap     │ │ Wait         │
└──────────────────┘ └─────────────┘ └──────────────┘
```

### 2.2 Chuyển đổi chế độ (MapManager)

Robot có 2 chế độ hoạt động, quản lý bởi `MapManagerNode`:

```python
# map_manager_node.py
class MapManagerNode(Node):
    def _set_mode_callback(self, request, response):
        if new_mode == RobotMode.NAVIGATION:
            success, message = self._activate_nav2_stack()
        else:
            success, message = self._deactivate_nav2_stack()
```

Quá trình kích hoạt Nav2 stack sử dụng **ROS2 Lifecycle** — mỗi node Nav2 đi qua các trạng thái:

```
UNCONFIGURED ──configure──▶ INACTIVE ──activate──▶ ACTIVE
     ▲                                                │
     └──────────cleanup◀──deactivate◀─────────────────┘
```

Thứ tự kích hoạt (quan trọng — phụ thuộc lẫn nhau):
1. `map_server` → nạp bản đồ
2. `amcl` → bắt đầu định vị
3. `controller_server` → sẵn sàng điều khiển
4. `planner_server` → sẵn sàng lập đường đi
5. `bt_navigator` → điều phối tổng thể

Thứ tự hủy kích hoạt: ngược lại (bt_navigator → ... → map_server).

### 2.3 AMCL — Định vị trên bản đồ

#### 2.3.1 Nguyên lý

**Adaptive Monte Carlo Localization** (AMCL) sử dụng **particle filter** (bộ lọc hạt) để ước lượng vị trí robot trên bản đồ đã biết.

##### Particle Filter (Bộ lọc hạt) là gì?

Particle filter là phương pháp ước lượng trạng thái (vị trí, hướng) của robot bằng cách sử dụng một tập hợp các "hạt" (particles). Mỗi hạt đại diện cho một giả thuyết về vị trí thực của robot.

Ý tưởng trực quan: Hãy tưởng tượng bạn thả 1000 con kiến lên bản đồ, mỗi con đứng ở một vị trí khác nhau. Mỗi con kiến "nghĩ" rằng mình đứng đúng chỗ robot thực sự đang đứng. Khi robot di chuyển và quan sát môi trường xung quanh, những con kiến nào đứng ở vị trí "hợp lý" (quan sát khớp với thực tế) sẽ được giữ lại và nhân bản, còn những con ở vị trí "vô lý" sẽ bị loại bỏ. Dần dần, tất cả con kiến tập trung quanh vị trí thực → đó chính là ước lượng vị trí robot.

##### Thuật toán Particle Filter chi tiết

```
┌─────────────────────────────────────────────────────────────────────┐
│ Bước 1: KHỞI TẠO (Initialization)                                  │
│   - Tạo N hạt, mỗi hạt là một bộ ba (x, y, θ)                    │
│   - Phân bố quanh vị trí ước đoán ban đầu theo Gaussian            │
│   - Mỗi hạt có trọng số w = 1/N (bằng nhau ban đầu)              │
├─────────────────────────────────────────────────────────────────────┤
│ Bước 2: DỰ ĐOÁN (Prediction) — khi robot di chuyển                │
│   - Robot di chuyển Δx, Δy, Δθ (từ odometry)                      │
│   - Mỗi hạt cũng di chuyển tương tự, CỘNG THÊM nhiễu ngẫu nhiên  │
│   - Nhiễu mô phỏng sai số bánh xe (trượt, lệch...)                │
│   - Kết quả: đám hạt "lan tỏa" ra xung quanh                      │
├─────────────────────────────────────────────────────────────────────┤
│ Bước 3: CẬP NHẬT (Update) — khi nhận scan LiDAR mới               │
│   - Với mỗi hạt: "Nếu robot ở vị trí này, scan LiDAR sẽ như       │
│     thế nào?" → so sánh với scan thực tế                           │
│   - Hạt ở vị trí đúng → scan kỳ vọng ≈ scan thực → trọng số cao  │
│   - Hạt ở vị trí sai → scan kỳ vọng ≠ scan thực → trọng số thấp  │
│   - Công thức: w_i = p(scan_thực | vị_trí_hạt_i, bản_đồ)         │
├─────────────────────────────────────────────────────────────────────┤
│ Bước 4: LẤY MẪU LẠI (Resampling)                                  │
│   - Chuẩn hóa trọng số: W_i = w_i / Σw_j                         │
│   - Lấy N hạt mới từ tập cũ theo xác suất W_i                     │
│   - Hạt trọng số cao → được chọn nhiều lần (nhân bản)             │
│   - Hạt trọng số thấp → không được chọn (bị loại)                 │
│   - Reset tất cả trọng số về 1/N                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Bước 5: ƯỚC LƯỢNG VỊ TRÍ                                         │
│   - Vị trí robot = trung bình có trọng số của tất cả hạt           │
│   - x_est = Σ(w_i × x_i), y_est = Σ(w_i × y_i)                   │
│   - Độ không chắc chắn = độ phân tán (covariance) của đám hạt     │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼ Lặp lại Bước 2-5 mỗi khi robot di chuyển/nhận scan mới
```

Ví dụ minh họa:

```
Thời điểm t=0: Robot mới bật, chưa biết ở đâu
   ○ ○ ○ ○ ○ ○ ○ ○     ← 8 hạt phân bố khắp nơi (thực tế: 500-2000 hạt)
   ○ ○ ○ ○ ○ ○ ○ ○        trọng số bằng nhau

Thời điểm t=1: Robot nhận scan LiDAR, thấy tường bên phải cách 1m
   ○ ○     ○ ○ ○          ← Hạt gần tường phải 1m: trọng số CAO (●)
       ● ● ●              ← Hạt xa tường: trọng số THẤP (○)
   ○     ● ●   ○

Thời điểm t=2: Sau resampling
       ● ● ●              ← Hạt trọng số cao được nhân bản
       ● ● ●              ← Hạt trọng số thấp bị loại
       ● ●                ← Đám hạt hội tụ → biết robot ở đâu

Thời điểm t=3: Robot di chuyển 10cm về phía trước
       → → →              ← Tất cả hạt dịch 10cm + nhiễu nhỏ
        → → →             ← Lại lan tỏa một chút
       → →
```

So sánh với các phương pháp định vị khác:
- **Kalman Filter**: Giả sử phân phối xác suất là Gaussian → nhanh nhưng không xử lý được đa đỉnh (robot có thể ở nhiều vị trí)
- **Particle Filter**: Không giả sử hình dạng phân phối → xử lý được tình huống mơ hồ (hành lang dài, kidnapped robot) nhưng tốn tính toán hơn

##### Thuật toán chi tiết trong AMCL

1. Khởi tạo N hạt (particles) phân bố quanh vị trí ước đoán ban đầu
2. Mỗi khi robot di chuyển → cập nhật vị trí các hạt theo mô hình chuyển động (+ nhiễu)
3. Mỗi khi nhận scan LiDAR → tính trọng số cho từng hạt bằng likelihood field model
4. Resampling: loại bỏ hạt trọng số thấp, nhân bản hạt trọng số cao
5. Ước lượng vị trí = trung bình có trọng số của tất cả hạt

#### 2.3.2 Mô hình chuyển động (Motion Model)

```yaml
robot_model_type: "nav2_amcl::DifferentialMotionModel"
alpha1: 0.2  # Nhiễu quay do quay
alpha2: 0.2  # Nhiễu quay do tịnh tiến
alpha3: 0.2  # Nhiễu tịnh tiến do tịnh tiến
alpha4: 0.2  # Nhiễu tịnh tiến do quay
alpha5: 0.2  # Nhiễu tịnh tiến bổ sung
```

Mô hình differential drive tính toán sai số tích lũy dựa trên 5 tham số alpha. Giá trị 0.2 cho thấy mức nhiễu vừa phải — phù hợp với robot nhỏ trên mặt phẳng.

#### 2.3.3 Mô hình cảm biến (Sensor Model)

```yaml
laser_model_type: "likelihood_field"
laser_max_range: 6.0    # LDS02RR max range
laser_min_range: 0.15   # LDS02RR min range
max_beams: 180          # Số tia laser sử dụng (từ 360 tia thực tế)
```

**Likelihood field model**: Với mỗi điểm laser, tính khoảng cách đến vật cản gần nhất trên bản đồ. Xác suất quan sát:

```
p(z|x, m) = z_hit × p_hit + z_rand × p_rand + z_max × p_max
```

Với:
- `z_hit = 0.5` — trọng số cho laser trúng vật cản
- `z_rand = 0.5` — trọng số cho nhiễu ngẫu nhiên
- `z_max = 0.05` — trọng số cho laser không phản hồi
- `sigma_hit = 0.2` — độ lệch chuẩn của phân phối Gaussian

#### 2.3.4 Adaptive Particle Count

```yaml
min_particles: 500
max_particles: 2000
pf_err: 0.05     # Sai số tối đa chấp nhận
pf_z: 0.99       # Độ tin cậy thống kê
```

Số lượng hạt tự động điều chỉnh dựa trên KL-divergence giữa phân phối hạt hiện tại và phân phối "thực". Khi robot chắc chắn vị trí (các hạt hội tụ) → giảm xuống 500 hạt. Khi mất định vị (kidnapped robot) → tăng lên 2000 hạt.

### 2.4 NavFn Planner — Lập đường đi toàn cục

#### 2.4.1 Nguyên lý

```yaml
planner_plugins: ["GridBased"]
GridBased:
  plugin: "nav2_navfn_planner/NavfnPlanner"
  tolerance: 0.5
  use_astar: true
  allow_unknown: true
```

NavFn sử dụng thuật toán **A*** trên global costmap để tìm đường đi ngắn nhất từ vị trí hiện tại đến goal.

#### 2.4.2 Thuật toán A*

```
f(n) = g(n) + h(n)
```

Trong đó:
- `g(n)` = chi phí thực từ start đến node n (tích lũy qua costmap)
- `h(n)` = heuristic — khoảng cách Euclidean từ n đến goal (ước lượng lạc quan)
- `f(n)` = tổng chi phí ước tính

A* đảm bảo tìm đường đi tối ưu (ngắn nhất) nếu heuristic không bao giờ đánh giá cao hơn chi phí thực (admissible).

#### 2.4.3 Global Costmap

Bản đồ chi phí toàn cục gồm 3 lớp chồng nhau:

```
┌─────────────────────────────────┐
│         Inflation Layer         │  ← Vùng đệm quanh vật cản
├─────────────────────────────────┤
│         Obstacle Layer          │  ← Vật cản từ LiDAR real-time
├─────────────────────────────────┤
│         Static Layer            │  ← Bản đồ tĩnh đã lưu
└─────────────────────────────────┘
```

Tham số quan trọng:
```yaml
robot_radius: 0.12           # Bán kính robot 12cm
resolution: 0.05             # 5cm/pixel
inflation_radius: 0.45       # Vùng đệm 45cm quanh vật cản
cost_scaling_factor: 10.0    # Tốc độ giảm chi phí theo khoảng cách
track_unknown_space: true    # Coi vùng chưa biết là không đi được
```

Công thức inflation cost:

```
cost(d) = 253 × e^(-cost_scaling_factor × (d - robot_radius))
```

Với `d` = khoảng cách đến vật cản gần nhất. Chi phí giảm theo hàm mũ từ 253 (sát vật cản) đến 0 (ngoài inflation_radius).

### 2.5 DWB Local Planner — Điều khiển bám đường

#### 2.5.1 Nguyên lý

**Dynamic Window Approach (DWB)** là thuật toán điều khiển local — tạo ra các quỹ đạo khả thi trong không gian vận tốc (v, ω) và chọn quỹ đạo tốt nhất.

#### 2.5.2 Không gian vận tốc

```yaml
min_vel_x: 0.0          # Không lùi
max_vel_x: 0.3          # Tốc độ tối đa 0.3 m/s
max_vel_y: 0.0          # Differential drive — không di chuyển ngang
max_vel_theta: 1.0      # Tốc độ quay tối đa 1.0 rad/s
acc_lim_x: 0.5          # Gia tốc tịnh tiến 0.5 m/s²
acc_lim_theta: 1.0      # Gia tốc quay 1.0 rad/s²
```

Dynamic window = tập hợp các vận tốc (v, ω) mà robot có thể đạt được trong 1 chu kỳ điều khiển (với giới hạn gia tốc):

```
V_dw = { (v, ω) | v ∈ [v_c - a_max·dt, v_c + a_max·dt],
                   ω ∈ [ω_c - α_max·dt, ω_c + α_max·dt] }
```

#### 2.5.3 Mô phỏng quỹ đạo

Với mỗi cặp (v, ω) trong dynamic window, mô phỏng quỹ đạo trong `sim_time: 1.2` giây:

```yaml
vx_samples: 40        # 40 mẫu vận tốc tịnh tiến
vtheta_samples: 40    # 40 mẫu vận tốc quay
sim_time: 1.2         # Mô phỏng 1.2 giây về phía trước
linear_granularity: 0.05    # Bước mô phỏng 5cm
angular_granularity: 0.025  # Bước mô phỏng 0.025 rad
```

Tổng cộng: 40 × 40 = 1600 quỹ đạo được đánh giá mỗi chu kỳ.

#### 2.5.4 Hàm đánh giá (Critics)

Mỗi quỹ đạo được chấm điểm bởi tập hợp các critics:

```yaml
critics: ["RotateToGoal", "Oscillation", "BaseObstacle",
          "GoalAlign", "PathAlign", "PathDist", "GoalDist"]
```

| Critic | Scale | Mục đích |
|--------|-------|----------|
| RotateToGoal | 32.0 | Quay mặt về hướng goal khi gần đích |
| BaseObstacle | 0.05 | Phạt quỹ đạo gần vật cản |
| GoalAlign | 16.0 | Hướng robot về phía goal |
| PathAlign | 20.0 | Giữ robot song song với đường đi toàn cục |
| PathDist | 20.0 | Giữ robot gần đường đi toàn cục |
| GoalDist | 16.0 | Ưu tiên quỹ đạo tiến gần goal |

Điểm tổng:

```
score(traj) = Σᵢ scale_i × critic_i(traj)
```

Quỹ đạo có điểm thấp nhất được chọn (lower = better).

#### 2.5.5 Goal Tolerance

```yaml
xy_goal_tolerance: 0.15    # Đến gần goal 15cm → coi là đã đến
yaw_goal_tolerance: 0.25   # Sai lệch hướng ≤ 0.25 rad (~14°)
```

### 2.6 Behavior Server — Phục hồi khi kẹt

Khi robot bị kẹt (không tiến triển), BT Navigator kích hoạt các behavior phục hồi:

```yaml
behavior_plugins: ["spin", "backup", "drive_on_heading", "wait"]
```

Thứ tự thử:
1. **Spin** — quay tại chỗ 360° để clear costmap
2. **Backup** — lùi lại một đoạn
3. **Wait** — đợi vật cản di chuyển
4. **DriveOnHeading** — thử đi thẳng theo hướng hiện tại

### 2.7 Giao diện điều khiển Navigation

Từ dashboard web, người dùng click vào bản đồ để gửi goal:

```typescript
// app/src/stores/nav-store.ts
sendGoal: (pose: PoseStamped) => {
    const goalId = getAction().sendGoal(
        { pose },              // NavigateToPose goal
        (result) => { ... },   // Callback khi hoàn thành
        (feedback) => { ... }, // Callback feedback (khoảng cách còn lại)
        (error) => { ... },    // Callback lỗi
    );
}
```

Action `/navigate_to_pose` (type `nav2_msgs/NavigateToPose`) được gọi qua rosbridge, cho phép:
- Gửi goal pose (x, y, θ) trên frame `map`
- Nhận feedback real-time (khoảng cách ước tính còn lại)
- Hủy goal bất kỳ lúc nào

---

## 3. Theo dõi người (Person Tracking)

Hệ thống theo dõi người gồm 3 tầng: **Nhận dạng** (detection + recognition), **Định vị** (sensor fusion), và **Điều khiển** (tracking controller).

### 3.1 Kiến trúc tổng thể

```
┌──────────┐     ┌──────────────────┐     ┌───────────────────┐
│ ESP32-CAM│────▶│ Person Tracker   │────▶│ Tracking          │
│ (MJPEG)  │     │ Node             │     │ Controller Node   │
└──────────┘     │                  │     │                   │
                 │ ┌──────────────┐ │     │ ┌─────────────┐   │
┌──────────┐     │ │ YOLOv8n     │ │     │ │ Servo PID   │   │──▶ /servo_cmd
│ LiDAR    │────▶│ │ InsightFace │ │     │ │ Yaw PID     │   │──▶ /cmd_vel
│ LDS02RR  │     │ │ Leg Cluster │ │     │ │ Linear PID  │   │
└──────────┘     │ └──────────────┘ │     │ │ Safety Arc  │   │
                 └──────────────────┘     │ │ FSM Search  │   │
                           │              │ └─────────────┘   │
                           ▼              └───────────────────┘
                 ┌──────────────────┐
                 │ Enrollment Node  │
                 │ (SQLite database)│
                 └──────────────────┘
```

### 3.2 Phát hiện cơ thể (Body Detection) — YOLOv8n

#### 3.2.1 Nguyên lý

YOLOv8n (nano) là mô hình object detection one-stage — xử lý toàn bộ ảnh trong 1 lần forward pass. Chỉ detect class `person` (class_id=0).

```python
# person_tracker_node.py
results = self.yolo_model(frame, classes=[0], verbose=False)
```

#### 3.2.2 Xử lý kết quả

Mỗi detection trả về bounding box `(x1, y1, x2, y2)` và confidence score. Chỉ giữ detection có confidence ≥ ngưỡng:

```python
if conf < self.body_confidence_threshold:  # default: 0.5
    continue
```

Bounding box được chuẩn hóa về tọa độ tương đối [0, 1]:

```python
body_bbox.center_x = float((x1 + x2) / 2 / w)  # tâm x / chiều rộng ảnh
body_bbox.center_y = float((y1 + y2) / 2 / h)  # tâm y / chiều cao ảnh
body_bbox.width = float((x2 - x1) / w)          # chiều rộng / chiều rộng ảnh
body_bbox.height = float((y2 - y1) / h)         # chiều cao / chiều cao ảnh
```

### 3.3 Nhận dạng khuôn mặt (Face Recognition) — InsightFace

#### 3.3.1 Pipeline

```
Body crop ──▶ InsightFace detect ──▶ Extract embedding ──▶ Match database
```

1. Cắt vùng body từ ảnh gốc
2. InsightFace (buffalo_l model) phát hiện khuôn mặt trong vùng body
3. Trích xuất embedding vector (512-d)
4. So khớp với database enrolled persons

#### 3.3.2 Trích xuất Face Embedding

```python
# Chọn khuôn mặt lớn nhất trong body crop
face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
```

InsightFace `buffalo_l` tạo vector embedding 512 chiều, được chuẩn hóa L2:

```python
embedding = face.embedding / np.linalg.norm(face.embedding)
```

#### 3.3.3 So khớp Cosine Similarity

```python
def _match_embedding(self, embedding: np.ndarray) -> tuple[str, float]:
    for person_id, (_name, enrolled_emb) in self.enrolled_embeddings.items():
        score = float(np.dot(embedding, enrolled_emb))  # cosine similarity
        if score > best_score:
            best_score = score
            best_id = person_id
    return best_id, best_score
```

Vì cả 2 vector đều đã chuẩn hóa L2 (norm = 1), dot product chính là cosine similarity:

```
cos(θ) = A · B / (|A| × |B|) = A · B   (khi |A| = |B| = 1)
```

Ngưỡng nhận dạng: `embedding_threshold: 0.6` — nếu cosine similarity ≥ 0.6 → xác nhận danh tính.

#### 3.3.4 Confidence Decay

Khi khuôn mặt không còn nhìn thấy (người quay lưng, che mặt), hệ thống duy trì danh tính nhưng giảm dần confidence:

```python
def _apply_confidence_decay(self, track_info, current_time):
    time_since_face = current_time - track_info.get("last_face_time", current_time)
    decayed = max(0.0, track_info.get("confidence", 0.0)
                  - time_since_face * self.confidence_decay_rate)
    if decayed < 0.3:  # Dưới 0.3 → xóa danh tính
        track_info["person_id"] = ""
        return "", 0.0
    return stored_id, decayed
```

Với `confidence_decay_rate: 0.1`:
- Sau 3 giây không thấy mặt: confidence giảm 0.3 (từ 0.6 xuống 0.3 → mất danh tính)
- Hiệu ứng: robot "nhớ" người trong vài giây khi họ quay lưng

#### 3.3.5 Track Matching (IoU)

Để theo dõi liên tục cùng một người qua các frame, hệ thống dùng **Intersection over Union (IoU)** giữa bounding box frame trước và frame hiện tại:

```python
def _compute_iou(self, bbox1, bbox2) -> float:
    # Tính vùng giao (intersection)
    inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
    # Tính vùng hợp (union)
    union_area = area1 + area2 - inter_area
    return inter_area / union_area
```

Ngưỡng IoU: 0.3 — nếu IoU ≥ 0.3, coi là cùng track. Nếu không khớp track nào → tạo track mới.

Track bị xóa nếu không phát hiện trong 1 giây (`> 1.0s`).

### 3.4 Sensor Fusion — Kết hợp Camera và LiDAR

#### 3.4.1 Vấn đề

Camera cho biết **hướng** (bearing) của người nhưng không biết **khoảng cách** (range). LiDAR cho biết khoảng cách chính xác nhưng không phân biệt được người với vật cản khác. Cần kết hợp 2 nguồn.

#### 3.4.2 Tính bearing từ camera

**Bước 1**: Chuyển pixel → góc trong camera frame

```python
# bearing_transform.py
def pixel_to_laser_bearing(self, u, image_width, k, stamp):
    fx = float(k[0])       # focal length x (từ camera intrinsics)
    cx = float(k[2])       # principal point x
    theta_cam = math.atan((u - cx) / fx)  # góc trong camera frame
```

Công thức pinhole camera:

```
θ_cam = arctan((u - cx) / fx)
```

Trong đó:
- `u` = tọa độ pixel ngang của tâm body
- `cx` = tâm quang học (principal point)
- `fx` = tiêu cự theo pixel

**Bước 2**: Chuyển đổi frame camera → frame laser qua TF2

```python
    # Tạo điểm 3D trên tia camera
    point.point.x = math.sin(theta_cam)
    point.point.y = 0.0
    point.point.z = math.cos(theta_cam)

    # Transform sang laser_link frame
    transform = self.tf_buffer.lookup_transform(
        self.laser_frame, self.camera_frame, stamp)
    transformed = tf2_geometry_msgs.do_transform_point(point, transform)

    # Tính bearing trong mặt phẳng laser
    return math.atan2(transformed.point.y, transformed.point.x)
```

Quá trình: tạo điểm đơn vị trên tia nhìn camera → biến đổi sang hệ tọa độ laser → tính góc 2D.

#### 3.4.3 Leg Clustering từ LiDAR

**Bước 1**: Phân cụm (clustering) các điểm LiDAR liền kề

```python
# leg_clusterer.py
def cluster_scan(ranges, angle_min, angle_increment, ...):
    # Với mỗi điểm LiDAR:
    # - Nếu khoảng cách đến điểm trước > range_jump_threshold (0.05m)
    #   → bắt đầu cluster mới
    # - Ngược lại → thêm vào cluster hiện tại

    # Lọc cluster theo kích thước chân người:
    if min_width <= width <= max_width:  # 0.05m ≤ width ≤ 0.30m
        clusters.append(LegCluster(...))
```

**Bước 2**: Ghép cặp chân (leg pairing)

```python
def pair_legs(clusters, min_gap=0.15, max_gap=0.35):
    for left in clusters:
        for right in clusters:
            gap = distance(left.centroid, right.centroid)
            if min_gap <= gap <= max_gap:  # 15cm ≤ gap ≤ 35cm
                # Tính trung điểm → vị trí người
                pairs.append((range, bearing))
```

Giả thiết: 2 chân người cách nhau 15–35cm. Trung điểm 2 chân = vị trí người.

#### 3.4.4 Kết hợp bearing và range

```python
# person_tracker_node.py - _assign_metric_range()
def _assign_metric_range(self, body_bbox, width, stamp):
    # 1. Tính bearing từ camera
    bearing_rad = self.bearing_transform.pixel_to_laser_bearing(...)

    # 2. Tìm leg-pair gần nhất theo bearing
    pairs = pair_legs(clusters, ...)

    # 3. Chọn pair có góc gần nhất với camera bearing
    best_range, best_bearing = min(pairs, key=angular_distance)

    # 4. Kiểm tra tolerance
    if angular_distance > self.bearing_match_tolerance:  # 0.10 rad
        return nan, bearing_rad  # Không khớp → chỉ trả bearing, range = NaN

    return best_range, bearing_rad
```

Ngưỡng `bearing_match_tolerance_rad: 0.10` (~5.7°) — nếu góc giữa camera bearing và leg-pair bearing chênh lệch quá 0.10 rad → không ghép (tránh gán sai range).

### 3.5 Enrollment — Đăng ký người

#### 3.5.1 Quy trình đăng ký

```
┌───────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│ IDLE      │────▶│ FACE_DETECTED│────▶│ SCANNING    │────▶│ READY    │
│ (chờ mặt) │     │ (thấy mặt)  │     │ (thu 10     │     │ (có thể │
│           │     │              │     │  frame)     │     │  lưu)    │
└───────────┘     └──────────────┘     └─────────────┘     └──────────┘
```

Enrollment node thu thập `scan_frames: 10` frame có khuôn mặt, trích xuất embedding trung bình, lưu vào SQLite database cùng với thumbnail.

#### 3.5.2 Hot-reload Database

Person tracker node tự động phát hiện thay đổi database mỗi giây:

```python
def _check_db_changes(self):
    mtime = os.path.getmtime(self.db_path)
    if mtime > self.db_last_modified:
        self._reload_embeddings()
```

Khi enrollment node thêm người mới → file database thay đổi → tracker tự reload → nhận dạng ngay lập tức.

#### 3.5.3 Chọn mục tiêu theo dõi

Hệ thống hỗ trợ 2 chế độ:
- **Có target**: Chỉ theo dõi người đã đăng ký (qua `SetTrackingTarget` service)
- **Không có target**: Tự động theo dõi người lớn nhất trong khung hình

```python
if self.current_target_id:
    is_target = person_id == self.current_target_id
else:
    # Không có target → chọn person có body bbox lớn nhất
    largest_idx = max(range(len(tracked_persons)),
        key=lambda i: tracked_persons[i].body_bbox.width
                    * tracked_persons[i].body_bbox.height)
    tracked_persons[largest_idx].is_target = True
```

### 3.6 Tracking Controller — Điều khiển theo dõi

#### 3.6.1 Finite State Machine (FSM)

```
                    target detected
         ┌─────────────────────────────────┐
         ▼                                 │
┌──────────────┐  lost > 0.5s  ┌───────────┴───┐
│   TRACKING   │──────────────▶│ SEARCH_CONTINUE│
│ (bám target) │               │ (tiếp tục     │
└──────────────┘               │  hướng cũ)    │
                               └───────┬───────┘
                                       │ 0.5s timeout
                                       ▼
                               ┌───────────────┐
                               │  SEARCH_SCAN  │
                               │ (quét servo   │
                               │  trái-phải)   │
                               └───────┬───────┘
                                       │ 2.0s timeout
                                       ▼
                               ┌───────────────┐
                               │ SEARCH_ROTATE │
                               │ (quay body    │
                               │  360°)        │
                               └───────┬───────┘
                                       │ 5.0s timeout
                                       ▼
                               ┌───────────────┐
                               │     IDLE      │
                               │ (dừng hoàn    │
                               │  toàn)        │
                               └───────────────┘
```

Các timeout cấu hình:
```yaml
lost_timeout: 0.5                # Mất target → chuyển sang search
search_continue_duration: 0.5    # Tiếp tục hướng cũ 0.5s
search_scan_duration: 2.0        # Quét servo 2s
search_rotate_duration: 5.0      # Quay body 5s
```

#### 3.6.2 PID Controller 3 tầng

Hệ thống sử dụng 3 bộ PID controller độc lập:

**PID cơ bản:**

```python
class PID:
    def step(self, error, dt):
        self.integral += error * dt
        derivative = (error - self.previous_error) / dt
        output = self.kp * error + self.ki * self.integral + self.kd * derivative
        return clamp(output, -limit, +limit)
```

Công thức:

```
u(t) = Kp × e(t) + Ki × ∫e(τ)dτ + Kd × de(t)/dt
```

**Tầng 1 — Servo PID** (50 Hz):

```yaml
pid_servo_kp: 2.0    # Phản ứng nhanh
pid_servo_ki: 0.0    # Không tích lũy
pid_servo_kd: 0.1    # Giảm dao động
max_servo_angle: 1.57  # ±90°
```

Mục đích: Xoay camera servo để giữ target ở giữa khung hình.
- Input: bearing_rad (góc từ camera đến target)
- Output: delta góc servo

```python
servo_delta = self.servo_pid.step(target.bearing_rad, 1/50) * (1/50)
self.current_servo_angle += servo_delta
```

**Tầng 2 — Wheel Yaw PID** (10 Hz):

```yaml
pid_wheel_yaw_kp: 0.5
pid_wheel_yaw_ki: 0.0
pid_wheel_yaw_kd: 0.05
max_angular_speed: 1.0  # rad/s
servo_handoff_threshold: 0.52  # ~30°
```

Mục đích: Khi servo xoay quá 30° (servo_handoff_threshold), quay toàn bộ body robot để "trả" servo về giữa.
- Input: current_servo_angle
- Output: angular velocity (cmd_vel.angular.z)

```python
def _tracking_yaw_command(self):
    if abs(self.current_servo_angle) <= self.servo_handoff_threshold:
        return 0.0  # Servo đủ khả năng → không cần quay body
    yaw = self.yaw_pid.step(self.current_servo_angle, 1/10)
    # Đồng thời kéo servo về giữa
    self.current_servo_angle -= copysign(min(abs(angle), center_step), angle)
    return yaw
```

**Tầng 3 — Linear PID** (10 Hz):

```yaml
pid_linear_kp: 0.3
pid_linear_ki: 0.0
pid_linear_kd: 0.05
max_linear_speed: 0.3      # m/s
target_distance_min: 1.0   # Khoảng cách lý tưởng min
target_distance_max: 1.5   # Khoảng cách lý tưởng max
distance_too_far: 2.5      # Quá xa → tốc độ tối đa
distance_too_close: 0.6    # Quá gần → lùi tốc độ tối đa
```

Mục đích: Giữ khoảng cách target trong vùng 1.0–1.5m.

```python
def _tracking_linear_command(self):
    if target_distance_min <= range <= target_distance_max:
        return 0.0  # Trong vùng lý tưởng → đứng yên
    if range >= distance_too_far:
        return max_linear_speed   # Quá xa → chạy max
    if range <= distance_too_close:
        return -max_linear_speed  # Quá gần → lùi max
    # Vùng trung gian → PID smooth
    center = (target_distance_min + target_distance_max) / 2
    return self.linear_pid.step(range - center, 1/10)
```

#### 3.6.3 Safety Arc Check

Trước khi gửi lệnh di chuyển, kiểm tra vùng an toàn phía trước:

```python
@staticmethod
def front_arc_clear(scan, min_dist=0.3, half_arc_rad=0.35):
    for index, distance in enumerate(scan.ranges):
        angle = scan.angle_min + index * scan.angle_increment
        wrapped = atan2(sin(angle), cos(angle))
        if abs(wrapped) <= half_arc_rad and distance < min_dist:
            return False  # Có vật cản trong vùng nguy hiểm
    return True
```

Tham số:
- `front_safety_distance: 0.3` — khoảng cách tối thiểu 30cm
- `front_safety_half_arc_rad: 0.35` — cung quét ±20° phía trước

Nếu phát hiện vật cản → `cmd.linear.x = 0.0` (dừng tiến, vẫn cho phép quay).

#### 3.6.4 Search Behavior khi mất target

**SEARCH_CONTINUE** (0.5s): Tiếp tục quay nhẹ theo hướng target biến mất.

```python
cmd.angular.z = self.last_movement_direction * 0.3  # 0.3 rad/s
```

**SEARCH_SCAN** (2.0s): Quét servo trái-phải tìm target.

```python
scan_speed = 2.0 * max_servo_angle / search_scan_duration
self.scan_angle += self.scan_direction * scan_speed * dt
if abs(self.scan_angle) >= max_servo_angle:
    self.scan_direction *= -1.0  # Đảo chiều
```

**SEARCH_ROTATE** (5.0s): Quay toàn bộ body 360°.

```python
cmd.angular.z = (2π) / search_rotate_duration  # ≈ 1.26 rad/s
```

Nếu target xuất hiện lại ở bất kỳ giai đoạn nào → quay về TRACKING ngay lập tức.

---

## Tổng kết

| Chức năng | Thuật toán chính | Thư viện/Framework |
|-----------|------------------|-------------------|
| Xây dựng bản đồ | Graph-based SLAM, Ceres Solver | SLAM Toolbox |
| Khám phá tự động | Frontier-based Exploration | explore_lite |
| Định vị | Adaptive Monte Carlo Localization | Nav2 AMCL |
| Lập đường đi | A* trên costmap | Nav2 NavFn |
| Bám đường | Dynamic Window Approach | Nav2 DWB |
| Phát hiện người | YOLOv8n (CNN one-stage) | Ultralytics |
| Nhận dạng mặt | ArcFace embedding + Cosine similarity | InsightFace |
| Định vị người | Camera-LiDAR bearing fusion + Leg clustering | Custom |
| Điều khiển theo dõi | PID 3 tầng + FSM | Custom |
