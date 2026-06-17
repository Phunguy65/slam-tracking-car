# Bài thuyết trình — Hệ thống Xe Robot Tự hành SLAM

## Phần 1: Giới thiệu đề tài (Slide 01–02)

### Slide 01 — Trang bìa

> Xin chào thầy và các bạn. Hôm nay nhóm 2 chúng em sẽ trình bày đồ án môn Xây dựng các hệ thống nhúng với đề tài: **Hệ thống Xe Robot Tự hành SLAM**.
>
> Hệ thống có ba chức năng chính: khám phá và xây dựng bản đồ tự động, điều hướng tự động trong bản đồ đã có, và theo dõi người bằng thị giác máy tính kết hợp LiDAR.
>
> Nhóm chúng em gồm 5 thành viên: Nguyễn Ngọc Phú, Ngô Tấn Sang, Văn Minh Tấn, Vũ Tiến Đạt và Huỳnh Phát Tài, dưới sự hướng dẫn của thầy Nguyễn Trọng Huân.

### Slide 02 — Tổng quan hệ thống

> Hệ thống hoạt động ở 3 chế độ:
>
> **Chế độ 1 — Khám phá bản đồ:** Robot sử dụng SLAM Toolbox để xây dựng bản đồ từ dữ liệu LiDAR, kết hợp explore_lite tự động tìm và di chuyển đến các vùng chưa khám phá.
>
> **Chế độ 2 — Điều hướng tự động:** Khi đã có bản đồ, Nav2 Stack lo phần định vị bằng AMCL, lập đường đi bằng A*, và bám đường bằng Dynamic Window Approach.
>
> **Chế độ 3 — Theo dõi người:** YOLOv8n phát hiện người, InsightFace nhận dạng khuôn mặt, Camera-LiDAR fusion xác định vị trí người trong không gian, PID 3 tầng điều khiển robot bám theo.
>
> Sơ đồ bên dưới cho thấy luồng dữ liệu chính: LiDAR → SLAM Toolbox → Nav2 → Motor, và ESP32-CAM kết nối riêng vào hệ thống.

---

## Phần 2: Phần cứng (Slide 03–04)

### Slide 03 — Kiến trúc phần cứng

> Phần cứng được thiết kế module hóa, chia thành 4 khối chính:
>
> **Khối Cảm biến** gồm: LiDAR LDS02RR giao tiếp UART quét 360 độ, IMU MPU6050 đo gia tốc và con quay 6 trục qua I2C, 2 encoder đo tốc độ bánh, và ESP32-CAM phát video MJPEG qua HTTP.
>
> **Khối Xử lý** có 2 vi điều khiển: ESP32 Main chạy micro-ROS — đây là node ROS2 thực thụ giao tiếp qua WiFi UDP tới micro-ROS Agent trên máy tính. ESP32-CAM chỉ phát video stream, không chạy micro-ROS.
>
> **Khối Chấp hành** gồm driver TB6612 điều khiển 2 motor DC bằng PWM, và 2 servo SG90 tạo cơ cấu pan/tilt cho camera.
>
> **Khối Nguồn** sử dụng 3 cặp pin Li-ion 18650 với 2 mạch buck LM2596 hạ áp cho logic, motor nhận nguồn trực tiếp từ pin.
>
> Tổng chi phí phần cứng khoảng 1.200.000 VNĐ — khá hợp lý cho một project sinh viên.

### Slide 04 — Firmware

> Firmware viết trên PlatformIO, module hóa theo chức năng.
>
> ESP32 Main là một micro-ROS node đầy đủ, chia thành các module: motors nhận lệnh /cmd_vel, encoders publish odometry, imu publish dữ liệu thô, lidar publish /scan, servos nhận /servo_cmd và publish /joint_states.
>
> Module safety có watchdog timer — nếu mất kết nối với micro-ROS Agent quá thời gian, motor tự động dừng để tránh robot chạy không kiểm soát.
>
> ESP32-CAM đơn giản hơn — chỉ phát MJPEG stream trên cổng 80. Node cam_bridge_node bên ROS2 sẽ kéo frame về và publish ra topic /camera/image_raw.
>
> Cấu hình WiFi, IP của agent, và các chân GPIO đều nằm trong file .env — dễ thay đổi khi đổi môi trường mạng.

---

## Phần 3: Xây dựng bản đồ (Slide 05–06)

### Slide 05 — Scan Matching (So khớp quét)

> Bước đầu tiên để xây dựng bản đồ là xác định robot đã di chuyển bao xa giữa hai lần quét LiDAR. SLAM Toolbox dùng phương pháp **correlative scan matching**.
>
> Ý tưởng: ta có bản đồ xác suất M và bản quét mới. Cần tìm phép biến đổi T (gồm dx, dy, dθ) sao cho khi áp T vào các điểm quét, chúng trùng khớp tốt nhất với bản đồ.
>
> Hàm lỗi: E(T) = tổng bình phương (1 − M(T·pᵢ)) — tức là ta muốn mỗi điểm quét rơi vào vùng có xác suất chiếm đóng cao trên bản đồ.
>
> Quá trình có 3 bước:
> 1. Xây dựng bản đồ xác suất từ scan trước
> 2. Quét thô — duyệt lưới bước 5cm, 2° để tìm vùng T có tổng xác suất cao nhất
> 3. Tối ưu tinh — Levenberg-Marquardt (Ceres Solver) hội tụ đến vị trí chính xác sub-pixel
>
> Kết quả là phép biến đổi T tối ưu giữa 2 frame lidar liên tiếp.

### Slide 06 — Loop Closure + Occupancy Grid

> Khi robot di chuyển lâu, sai số tích lũy dần từ scan matching. **Loop closure** giải quyết vấn đề này: khi robot quay lại vùng đã khám phá, thuật toán phát hiện sự trùng lặp và hiệu chỉnh toàn bộ đồ thị tư thế.
>
> Các ngưỡng cấu hình: cần ít nhất 10 scan liên tiếp mới kiểm tra, ngưỡng matching thô ≥ 0.35, matching tinh ≥ 0.45, variance tối đa ≤ 3.0.
>
> Bản đồ đầu ra là **Occupancy Grid** — lưới 2D với độ phân giải 0.05m/pixel. Mỗi ô có giá trị:
> - 0 = trống (robot đi được)
> - 100 = vật cản
> - −1 = chưa biết (chưa quét đến)
>
> Bản đồ cập nhật mỗi 5 giây. Đây là input cho cả explore_lite (tìm biên giới) và Nav2 (lập đường đi).

---

## Phần 4: Khám phá bản đồ (Slide 07–08)

### Slide 07 — Frontier Exploration

> Khi có bản đồ dạng occupancy grid, câu hỏi tiếp theo là: robot nên đi đâu để khám phá thêm? **explore_lite** trả lời bằng khái niệm **frontier** — biên giới giữa vùng đã biết (trống) và vùng chưa biết.
>
> Thuật toán BFS tìm tất cả frontier trên bản đồ, sau đó chấm điểm mỗi frontier theo công thức:
>
> score(f) = α × size(f) − β × cost(f) − γ × turn(f)
>
> Với cấu hình của chúng em: α = 0.8 (ưu tiên biên giới lớn), β = 5.0 (rất ưu tiên biên giới gần — robot nhỏ nên tránh đi xa), γ = 0.0 (bỏ qua góc quay vì robot quay tại chỗ rất nhanh).
>
> Frontier có điểm cao nhất được chọn, gửi tọa độ trung tâm đến Nav2 như một navigation goal. Vòng lặp này chạy mỗi 3 giây.
>
> Điều kiện dừng: khi không còn frontier nào có kích thước ≥ 0.35m — nghĩa là toàn bộ môi trường đã được khám phá.

### Slide 08 — Phối hợp SLAM + Exploration

> Slide này cho thấy cách SLAM Toolbox và explore_lite phối hợp thành vòng lặp khám phá tự động hoàn toàn:
>
> LiDAR quét → SLAM Toolbox xây bản đồ và publish /map → explore_lite nhận bản đồ, tìm frontier, chọn mục tiêu → gửi goal đến Nav2 → Nav2 tạo đường đi và publish /cmd_vel → Motor di chuyển robot → LiDAR quét vùng mới → vòng lặp tiếp tục.
>
> Toàn bộ quá trình không cần can thiệp thủ công. Robot sẽ tự khám phá cho đến khi hết frontier.

---

## Phần 5: Di chuyển trong bản đồ (Slide 09–11)

### Slide 09 — Kiến trúc Nav2

> Khi đã có bản đồ hoàn chỉnh, robot chuyển sang chế độ điều hướng. Nav2 Stack có kiến trúc phân tầng:
>
> Ở trên cùng là **BT Navigator** — sử dụng Behavior Tree để điều phối toàn bộ quá trình navigation.
>
> Bên dưới có 3 server:
> - **Planner Server** — lập đường đi toàn cục bằng A* trên Global Costmap
> - **Controller Server** — bám đường cục bộ bằng DWB trên Local Costmap (rolling window)
> - **Behavior Server** — xử lý khi robot bị kẹt: quay tại chỗ (Spin), lùi lại (Backup), hoặc chờ (Wait)
>
> Tất cả quản lý bởi ROS2 Lifecycle, khởi động theo thứ tự: map_server → amcl → controller → planner → bt_navigator.

### Slide 10 — AMCL (Bộ lọc hạt thích nghi)

> Trước khi lập đường đi, robot cần biết mình đang ở đâu trên bản đồ. **AMCL** giải quyết bằng bộ lọc hạt:
>
> **Bước 1 — Khởi tạo:** Rải 500–2000 hạt (particles) theo phân bố Gaussian quanh vị trí ban đầu. Mỗi hạt là một giả thuyết vị trí.
>
> **Bước 2 — Dự đoán:** Khi robot di chuyển, mỗi hạt được cập nhật theo odometry cộng thêm nhiễu ngẫu nhiên (các tham số α₁–α₅ = 0.2).
>
> **Bước 3 — Cập nhật:** So sánh scan LiDAR thực tế với bản đồ tại vị trí mỗi hạt bằng likelihood field model. Hạt khớp tốt → trọng số cao.
>
> **Bước 4 — Lấy mẫu lại:** Loại bỏ hạt trọng số thấp, nhân bản hạt trọng số cao. Dần dần các hạt hội tụ về vị trí thực của robot.
>
> Số hạt tự điều chỉnh dựa trên KL-divergence: khi robot mất phương hướng → nhiều hạt hơn, khi đã hội tụ → giảm hạt để tiết kiệm tính toán.

### Slide 11 — NavFn (A*) + DWB

> Khi đã biết vị trí, Nav2 lập đường đi và bám đường:
>
> **A*** tìm đường ngắn nhất trên costmap với f(n) = g(n) + h(n). Heuristic dùng khoảng cách Euclidean. Dung sai goal 0.5m — nghĩa là chỉ cần đến gần mục tiêu 0.5m là coi như đã tới.
>
> **Costmap Inflation** tạo vùng đệm quanh vật cản: bán kính robot 12cm, vùng đệm 45cm. Chi phí giảm theo hàm mũ cost(d) = 253 × e^(−10 × (d − 0.12)) — robot sẽ tự nhiên đi xa vật cản.
>
> **Dynamic Window Approach** là bộ điều khiển cục bộ: mô phỏng 1600 quỹ đạo khả thi (40 mẫu vận tốc thẳng × 40 mẫu vận tốc quay) trong 1.2 giây tương lai. Mỗi quỹ đạo được 7 critics chấm điểm — RotateToGoal (32.0) có trọng số cao nhất vì robot cần quay chính xác khi gần mục tiêu.
>
> Tốc độ tối đa: 0.3 m/s tịnh tiến và 1.0 rad/s quay — phù hợp với robot nhỏ trong nhà.

---

## Phần 6: Theo dõi người (Slide 12–15)

### Slide 12 — Kiến trúc 3 tầng

> Chế độ theo dõi người có kiến trúc 3 tầng:
>
> **Tầng 1 — Nhận dạng:** ESP32-CAM phát video → cam_bridge kéo về → person_tracker_node chạy YOLOv8n phát hiện người, InsightFace nhận dạng khuôn mặt, IoU tracking giữ ID ổn định qua các frame, và LiDAR cone fusion xác định khoảng cách.
>
> **Tầng 2 — Định vị:** Kết hợp bearing từ camera (qua TF2 transform) với range từ LiDAR cone → ra tọa độ (range_m, bearing_rad) cho mỗi người.
>
> **Tầng 3 — Điều khiển:** tracking_controller_node nhận thông tin người, chạy FSM quyết định trạng thái (IDLE/TRACKING/SEARCH), PID 3 tầng điều khiển servo pan và bánh xe.
>
> Có thêm enrollment_node quản lý database khuôn mặt (SQLite, hot-reload mỗi 1s) và Web Dashboard cho phép bật/tắt, chọn target, hoặc joystick thủ công qua rosbridge.

### Slide 13 — YOLOv8n + InsightFace + IoU Tracker

> Pipeline nhận dạng từng frame:
>
> 1. Nhận ảnh từ /camera/image_raw (10 Hz)
> 2. YOLOv8n detect bounding box class person, ngưỡng confidence ≥ 0.5
> 3. IoU matching: so bounding box mới với track cũ, IoU ≥ 0.3 → giữ track_id, ngược lại tạo track mới
> 4. Crop vùng body → InsightFace extract embedding 512 chiều → chuẩn hóa L2
> 5. Cosine similarity ≥ 0.6 → gán person_id từ database
> 6. TF2 tính bearing + LiDAR cone fusion → range
>
> Publish kết quả qua /tracked_persons (TrackedPersonArray).
>
> Cơ chế confidence decay: khi mất face (bị che, quay lưng), confidence giảm 0.1/giây. Dưới 0.3 → drop identity. Track mất hoàn toàn > 1 giây → xóa.

### Slide 14 — Camera-LiDAR Cone Fusion

> Đây là phần kết hợp cảm biến quan trọng nhất: Camera biết **hướng** nhưng không biết **khoảng cách**, LiDAR biết khoảng cách nhưng không phân biệt được đâu là người.
>
> **Bước 1 — Bearing từ pixel:** Từ tâm bounding box (pixel u), tính góc θ = arctan((u − cx) / fx). Với FOV 62° và ảnh rộng, fx tính được từ công thức fx = width / (2 × tan(FOV/2)).
>
> **Bước 2 — TF2 Transform:** Camera gắn trên servo pan, nên khi servo quay, frame camera_optical_frame thay đổi liên tục so với laser_link. TF2 xử lý việc chuyển đổi tọa độ này.
>
> **Bước 3 — LiDAR Cone:** Lấy tất cả tia LiDAR nằm trong cone ±0.17 rad (~10°) quanh bearing vừa tính. Chọn giá trị range nhỏ nhất trong các tia hợp lệ (0.3 – 4.0 m) làm khoảng cách đến người.
>
> Nếu không có tia nào valid trong cone → range = NaN → robot không di chuyển (chỉ servo tracking).

### Slide 15 — PID 3 tầng + Máy trạng thái

> Điều khiển chia thành 3 tầng PID độc lập:
>
> **Servo Pan PID (50 Hz, Kp=2.0):** Giữ target luôn ở giữa khung hình bằng cách quay servo. Tần số cao vì servo phản hồi nhanh.
>
> **Wheel Yaw PID (10 Hz, Kp=0.5):** Khi servo quay quá 30° (0.52 rad), thay vì ép servo quay thêm, PID này xoay cả thân robot rồi kéo servo về center. Chiến lược "Servo-first, Wheel-second".
>
> **Linear PID (10 Hz, Kp=0.3):** Giữ khoảng cách đến người trong vùng 0.15–0.25m. Nếu range > deadband → tiến, range < deadband → lùi.
>
> **An toàn:** LiDAR kiểm tra front arc ±0.35 rad (~20°) — nếu có vật cản < 0.15m → block forward ngay lập tức, bất kể PID ra lệnh gì.
>
> **FSM có 3 trạng thái:**
> - IDLE → khi phát hiện target ≥ 3 frame liên tiếp → TRACKING
> - TRACKING → nếu mất target > 2 giây → SEARCH_SCAN
> - SEARCH_SCAN → servo quét ±90° (1.57 rad), tìm được target → quay lại TRACKING, timeout 6s → về IDLE
>
> Target xuất hiện lại bất kì lúc nào đều quay về TRACKING ngay lập tức.

---

## Phần 7: Tổng kết (Slide 16)

### Slide 16 — Bảng tổng hợp

> Tóm lại, hệ thống sử dụng tổng cộng 9 thuật toán/phương pháp chính:
>
> | Chức năng | Thuật toán | Thư viện |
> |---|---|---|
> | Xây dựng bản đồ | Graph-based SLAM, Ceres Solver | SLAM Toolbox |
> | Khám phá tự động | Frontier-based Exploration | explore_lite |
> | Định vị | Adaptive Monte Carlo Localization | Nav2 AMCL |
> | Lập đường đi | A* trên costmap | Nav2 NavFn |
> | Bám đường | Dynamic Window Approach | Nav2 DWB |
> | Phát hiện người | CNN one-stage detection | YOLOv8n |
> | Nhận dạng mặt | ArcFace + Cosine similarity | InsightFace |
> | Định vị người | Camera bearing + LiDAR cone fusion | Custom (TF2) |
> | Điều khiển | PID 3 tầng + FSM | Custom |
>
> Toàn bộ hệ thống chạy trên ROS2 Humble, firmware ESP32 giao tiếp qua micro-ROS, tổng chi phí phần cứng ~1.2 triệu VNĐ.
>
> Cảm ơn thầy và các bạn đã lắng nghe. Nhóm em xin sẵn sàng trả lời câu hỏi.
