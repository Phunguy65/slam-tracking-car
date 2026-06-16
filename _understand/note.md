# Tại sao cần khoảng cách 2 bánh?
Vì cùng angular.z (cùng tốc độ xoay cơ thể), robot rộng hơn cần bánh xe quay nhanh hơn.
Hình dung 2 robot xoay cùng tốc độ góc (1 vòng/giây):
Robot nhỏ (L = 10cm):          Robot lớn (L = 50cm):

    ←5cm→                          ←25cm→
   [L]·[R]                      [L]·····[R]
    ↓   ↑                        ↓       ↑

Bánh chỉ cần đi                Bánh phải đi
vòng tròn bán kính 5cm         vòng tròn bán kính 25cm
→ tốc độ thấp                  → tốc độ cao gấp 5 lần
Cùng 1 vòng xoay, bánh xe cách tâm xa hơn phải đi quãng đường dài hơn → cần tốc độ lớn hơn.
Công thức v = angular.z × L/2 chính là tốc độ dài = tốc độ góc × bán kính — vật lý cơ bản của chuyển động tròn.
Nếu bỏ L/2 đi, robot rộng sẽ xoay chậm hơn mong muốn, robot hẹp sẽ xoay nhanh hơn mong muốn — Nav2 không thể điều khiển chính xác được.

# 3 cảm biến — mỗi cái trả lời 1 câu hỏi
Nghĩ đơn giản: robot cần biết 3 điều để hoạt động, và mỗi cảm biến đảm nhận 1 việc:
Cảm biến	Câu hỏi nó trả lời	Dữ liệu
Encoder	"Tôi đã đi được bao xa?"	Vị trí (x, y) + hướng (θ)
IMU	"Tôi đang xoay/rung nhanh thế nào?"	Gia tốc + tốc độ góc
LiDAR	"Xung quanh tôi có gì?"	Khoảng cách đến vật cản 360°
1. Encoder — "Đo bước chân"
Giống bạn đếm bước chân khi đi bộ. Mỗi bánh xe có đĩa 20 lỗ, sensor đếm số lỗ đi qua.
Bánh xe quay:    ●○●○●○●○●○●○●○●○●○●○  (20 lỗ = 1 vòng)
                  ↑ mỗi lỗ = 1 tick

1 vòng = chu vi bánh = 2π × bán_kính
1 tick = chu vi / 20
Từ số tick mỗi 20ms (encoders.cpp:61-104):
delta_left  = tick_trái × (2π × R / 20)     ← quãng đường bánh trái
delta_right = tick_phải × (2π × R / 20)     ← quãng đường bánh phải

Đi thẳng bao xa:  delta_s     = (trái + phải) / 2
Xoay bao nhiêu:   delta_theta = (phải - trái) / khoảng_cách_2_bánh

Vị trí mới:
  x += delta_s × cos(θ)
  y += delta_s × sin(θ)
  θ += delta_theta
Điểm yếu: Sai số tích lũy. Bánh trượt trên sàn nhẵn → encoder đếm sai → vị trí trôi dần. Đi 10m có thể lệch 20-30cm.
2. IMU (MPU6050) — "La bàn + cảm biến rung"
Đo 2 thứ (imu.cpp:71-80):
- Gia tốc (accelerometer): robot đang tăng tốc/giảm tốc theo hướng nào (m/s²)
- Tốc độ góc (gyroscope): robot đang xoay nhanh thế nào (rad/s)
Giá trị thô từ chip (16-bit integer)
         │
         ▼
Chia cho hệ số chuyển đổi:
  accel: giá_trị / 16384 × 9.81  → m/s²
  gyro:  giá_trị / 131 × π/180   → rad/s
         │
         ▼
Publish lên /imu/data_raw cho EKF trên PC
Vai trò: Bổ sung cho encoder. Khi bánh xe trượt (encoder sai), gyro vẫn đo đúng tốc độ xoay. EKF (Extended Kalman Filter) trên PC kết hợp cả hai để ra vị trí chính xác hơn:
              encoder nói: "xoay 10°"
                    │
EKF kết hợp ───────┼──────── → "thực tế xoay 12°"
                    │
              gyro nói: "xoay 13°"
EKF tin encoder nhiều hơn khi đi thẳng, tin gyro nhiều hơn khi xoay nhanh.
3. LiDAR (LDS02RR) — "Mắt 360°"
Bắn tia laser xoay tròn, đo khoảng cách đến vật cản ở 360 góc (lidar.cpp:124-146):
         90°
          │
          │    ← 2.1m (tường)
  180° ───●─── 0°      ← Robot ở giữa, quét 360°
          │
          │    ← 0.5m (ghế)
         270°

Kết quả: mảng 360 số [2.1, 2.0, ..., 0.5, ..., 1.8]
         ranges[0]   = khoảng cách ở 0°
         ranges[90]  = khoảng cách ở 90°
         ranges[270] = khoảng cách ở 270°
Mỗi 200ms (5Hz) gửi 1 bản quét đầy đủ lên PC qua topic /scan.
Vai trò kép:
1. Cho SLAM Toolbox: So khớp 2 bản quét liên tiếp → biết robot dịch chuyển chính xác bao nhiêu (scan matching), đồng thời vẽ bản đồ vật cản
2. Cho Nav2: Tạo costmap (bản đồ chi phí) — biết chỗ nào có vật cản để tránh
Cách 3 cảm biến phối hợp trong hệ thống
┌──────────────────── ESP32 (firmware) ────────────────────────┐
│                                                               │
│  Encoder ──→ tính odom (x,y,θ) ──→ publish /odom            │
│  IMU ──→ đọc accel+gyro ──→ publish /imu/data_raw           │
│  LiDAR ──→ quét 360° ──→ publish /scan                      │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │ WiFi (micro-ROS)
                            ▼
┌──────────────────── PC (ROS2) ───────────────────────────────┐
│                                                               │
│  EKF: /odom + /imu → vị trí chính xác (fused odometry)      │
│                                                               │
│  SLAM Toolbox: /scan + vị_trí → bản đồ + hiệu chỉnh vị trí │
│                                                               │
│  Nav2: bản đồ + /scan → tránh vật cản + lập đường đi        │
│                                                               │
│  explore_lite: bản đồ → tìm vùng chưa quét → gửi goal      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
Tóm lại:
- Encoder = ước lượng thô vị trí (nhanh, rẻ, nhưng trôi)
- IMU = bổ sung khi encoder sai (xoay, trượt)
- LiDAR = "mắt" — vừa giúp SLAM sửa vị trí, vừa phát hiện vật cản

# EKF — "Trọng tài" kết hợp Encoder + IMU
Vấn đề cần giải quyết
Encoder và IMU đều đo cùng 1 thứ (robot đang ở đâu, xoay thế nào) nhưng mỗi cái sai theo cách khác:
Encoder:  Chính xác khi đi thẳng, SAI khi bánh trượt
IMU:      Chính xác tức thời, SAI tích lũy theo thời gian (drift)
EKF (Extended Kalman Filter) giống một trọng tài — lắng nghe cả hai bên và quyết định ai đáng tin hơn ở mỗi thời điểm.
EKF hoạt động thế nào — Tương tự đời thực
Tưởng tượng bạn đi trong sương mù, có 2 bạn đồng hành:
- Bạn A (encoder): Đếm bước chân → biết đi bao xa, nhưng bước trượt trên băng thì đếm sai
- Bạn B (IMU): Cầm la bàn + cảm biến rung → biết xoay nhanh thế nào, nhưng nếu không hiệu chỉnh thì dần dần lệch
EKF liên tục hỏi cả hai và kết hợp:
Mỗi 20ms (50Hz):

┌─────────────────────────────────────────────────────────┐
│ Bước 1: DỰ ĐOÁN (Prediction)                           │
│                                                          │
│   "Dựa trên trạng thái cũ + mô hình chuyển động,       │
│    tôi NGHĨ robot bây giờ ở đây"                        │
│                                                          │
│   x_predicted = x_cũ + vx × dt                         │
│   θ_predicted = θ_cũ + ωz × dt                         │
│   uncertainty_predicted = uncertainty_cũ + process_noise│
│                                                          │
│   → Uncertainty TĂNG (vì dự đoán luôn có sai số)       │
├─────────────────────────────────────────────────────────┤
│ Bước 2: CẬP NHẬT (Update) — khi nhận measurement mới   │
│                                                          │
│   Nhận /odom: encoder nói "x=1.05, θ=0.3"              │
│   Nhận /imu:  gyro nói "ωz=0.15 rad/s"                 │
│                                                          │
│   So sánh measurement vs prediction:                    │
│     innovation = measurement - predicted                 │
│                                                          │
│   Tính Kalman Gain (K):                                 │
│     K = uncertainty_predicted / (uncertainty_predicted    │
│         + measurement_noise)                             │
│                                                          │
│   Cập nhật:                                             │
│     x_final = x_predicted + K × innovation              │
│     uncertainty_final = (1 - K) × uncertainty_predicted │
│                                                          │
│   → Uncertainty GIẢM (vì có thêm thông tin)            │
└─────────────────────────────────────────────────────────┘
Kalman Gain — trực giác
         uncertainty_dự_đoán
K = ─────────────────────────────────────
    uncertainty_dự_đoán + noise_cảm_biến

K gần 1 → tin cảm biến hơn (cảm biến ít nhiễu)
K gần 0 → tin dự đoán hơn (cảm biến nhiều nhiễu)
Cấu hình EKF trong dự án (ekf.yaml)
File ekf.yaml nói cho EKF biết lấy gì từ đâu:
# Từ encoder (/odom) — lấy:
odom0_config: [x, y, -, -, -, yaw, vx, -, -, -, -, vyaw, -, -, -]
#              ✓  ✓           ✓    ✓              ✓

# Từ IMU (/imu/data_raw) — lấy:
imu0_config:  [-, -, -, -, -, -, -, -, -, -, -, vyaw, ax, -, -]
#                                                 ✓    ✓
Dịch ra:
- Encoder cung cấp: vị trí (x, y), hướng (yaw), tốc độ thẳng (vx), tốc độ xoay (vyaw)
- IMU cung cấp: tốc độ xoay (vyaw) + gia tốc thẳng (ax)
Tốc độ xoay (vyaw) có cả hai nguồn — EKF sẽ kết hợp cả hai dựa trên covariance (độ tin cậy) của mỗi bên.
Ví dụ thực tế
Robot xoay trên sàn trơn:

  Encoder: "xoay 0.1 rad" (bánh trượt → đo thiếu)
  IMU:     "xoay 0.15 rad" (gyro đo trực tiếp → chính xác hơn)
  
  EKF biết covariance của encoder khi xoay = 0.06 (cao = ít tin)
  EKF biết covariance của IMU gyro = 0.02 (thấp = tin nhiều)
  
  → K_encoder = nhỏ, K_imu = lớn
  → Kết quả: "xoay ~0.13 rad" (thiên về IMU)
Robot đi thẳng ổn định:

  Encoder: "đi 0.10m" (bánh không trượt → chính xác)
  IMU:     accelerometer có drift nhỏ
  
  EKF biết covariance encoder vx = 0.025 (thấp = tin)
  EKF biết accelerometer drift tích lũy
  
  → Tin encoder hơn cho vị trí x, y
Scan Matching — SLAM Toolbox dùng LiDAR thế nào
Scan matching trả lời: "Robot dịch chuyển chính xác bao nhiêu giữa 2 lần quét?"
Tương tự đời thực
Tưởng tượng bạn chụp 2 ảnh phòng từ 2 vị trí khác nhau. Scan matching giống việc xếp chồng 2 ảnh lên nhau và dịch/xoay cho đến khi các đồ vật trùng khớp → khoảng dịch đó chính là robot đã di chuyển.
Quy trình 3 bước
Scan cũ (t-1):                    Scan mới (t):
                                   
   ████                               ████
   █                                   █
   █         ██                        █         ██
   █         ██                        █         ██
   ████████████                        ████████████
                                   
        ^robot ở đây                        ^robot ở đây
                                            (dịch sang phải 5cm?)
Bước 1 — Tạo "bản đồ xác suất" từ scan cũ:
Mỗi ô trên lưới = xác suất có vật cản
Áp Gaussian blur → vật cản "lan ra" tạo gradient mềm

  0.0  0.0  0.2  0.8  1.0  0.8  0.2  0.0     ← 1.0 = vật cản chắc chắn
  0.0  0.0  0.1  0.5  0.8  0.5  0.1  0.0     ← 0.0 = trống chắc chắn
Bước 2 — Quét thô (brute force):
Thử mọi phép dịch (dx, dy, dθ) trên lưới thô:
  dx: -20cm → +20cm, bước 5cm
  dy: -20cm → +20cm, bước 5cm
  dθ: -10° → +10°, bước 2°

Với mỗi (dx, dy, dθ):
  - Dịch tất cả điểm scan mới theo phép biến đổi đó
  - Tính tổng xác suất tại vị trí mới trên bản đồ
  - Tổng cao nhất = vị trí khớp nhất → ứng viên tốt nhất
Bước 3 — Tối ưu tinh (Ceres Solver):
Lấy ứng viên tốt nhất làm điểm xuất phát
Chạy Levenberg-Marquardt để tinh chỉnh đến sub-mm:

  Minimize: E(T) = Σ [1 - M(T · pᵢ)]²
  
  Nghĩa là: tìm T sao cho mỗi điểm scan mới,
  khi biến đổi qua T, rơi đúng vào vị trí vật cản
  trên bản đồ (M = 1) → lỗi = 0
Tại sao cần scan matching khi đã có EKF?
EKF (encoder+IMU):  "Robot ở khoảng (1.05, 0.32) ± 3cm"    ← ước lượng
Scan matching:      "Robot chắc chắn ở (1.03, 0.31)"        ← sửa lỗi

SLAM Toolbox dùng scan matching để:
1. Sửa sai số tích lũy của odometry
2. Xây bản đồ chính xác (vì biết chính xác robot ở đâu khi quét)
Mối quan hệ phân tầng:
Chính xác thấp ─────────────────────────────► Chính xác cao

  Encoder alone     EKF (encoder+IMU)     SLAM (scan matching)
  ±30cm/10m         ±5cm/10m              ±1-2cm
  
  Cập nhật: 50Hz    Cập nhật: 50Hz        Cập nhật: 5Hz
  Độ trễ: 0ms      Độ trễ: 0ms           Độ trễ: ~200ms
- EKF cho vị trí tức thời (nhanh, dùng cho điều khiển motor)
- SLAM sửa drift dài hạn (chậm hơn, nhưng chính xác hơn, dùng cho bản đồ)