**BỘ KHOA HỌC VÀ CÔNG NGHỆ **

**HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG**

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

![](media/image1.png)

**BÁO CÁO ĐỒ ÁN**

**Môn học: Hệ thống nhúng**

**Giảng viên hướng dẫn:**

**Thực hiện bởi nhóm sinh viên, bao gồm: **

1.  Nguyễn Ngọc Phú N22DCCN159

2.  Ngô Tấn Sang N22DCCN200

3.  Văn Minh Tấn N22DCCN200

4.  Vũ Tiến Đạt N22NFOFROFN

5.  Huỳnh Phát Tài qdfbfeww

**TP.HCM, tháng 05 /2026**

# MỤC LỤC

[MỤC LỤC](#mục-lục)

[GIỚI THIỆU VÀ CƠ SỞ KHOA HỌC](#giới-thiệu-và-cơ-sở-khoa-học)

[A. Giới thiệu đề tài](#giới-thiệu-đề-tài)

[1. Mục đích](#mục-đích)

[B. Cơ sở khoa học](#cơ-sở-khoa-học)

[2. Tình hình nghiên cứu trong và ngoài
nước](#tình-hình-nghiên-cứu-trong-và-ngoài-nước)

[3. Công nghệ sử dụng](#công-nghệ-sử-dụng)

[Thiết kế phần cứng](#_Toc8)

[A. Khối cảm biến và xử lý dữ liệu](#_Toc9)

[1. Mạch vi điều khiển trung tâm](#_Toc10)

[2. Cảm biến lidar](#_Toc11)

[3. Cảm biến quán tính](#_Toc12)

[4. Động cơ truyền động chính](#_Toc13)

[B. Khối Động lực & Điều khiển](#_Toc14)

[5. Module điều khiển động cơ](#_Toc15)

[6. Khung gầm và Bánh xe](#_Toc16)

[C. Khối Nguồn](#_Toc17)

[7. Cấp nguồn chính](#_Toc18)

[8. Module ổn áp](#_Toc19)

[D. Đánh giá, so sánh và tổng hợp hệ thống](#_Toc20)

[9. Sơ đồ nguyên lý hệ thống](#_Toc21)

[10. Trích dẫn Datasheet các linh kiện chính](#_Toc22)

[11. So sánh và Lựa chọn giải pháp](#_Toc23)

[E. Bảng dự toán tổng chi phí hệ thống (dự kiến)](#_Toc24)

[PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG](#_Toc25)

[A. UC-01: Tạo lập bản đồ bằng di chuyển thủ công](#_Toc26)

[1. Mô tả use case](#_Toc27)

[2. Lược đồ tuần tự](#_Toc28)

[3. Lược đồ hoạt động](#_Toc29)

[4. Lược đồ trạng thái](#_Toc30)

[5. Lược đồ lớp ý niệm](#_Toc31)

[6. Phân rã thành phần PM](#_Toc32)

[7. Bảng tham chiếu dò vết](#_Toc33)

[8. Tiêu chí kiểm thử](#_Toc34)

[B. UC-02: Tạo lập bản đồ bằng di chuyển tự động](#_Toc35)

[1. Mô tả use case](#_Toc36)

[2. Lược đồ tuần tự](#_Toc37)

[3. Lược đồ hoạt động](#_Toc38)

[4. Lược đồ trạng thái](#_Toc39)

[5. Lược đồ lớp ý niệm](#_Toc40)

[6. Phân rã thành phần PM](#_Toc41)

[4. Giao diện](#_Toc42)

[1. Bảng tham chiếu dò vết](#_Toc43)

[2. Tiêu chí kiểm thử](#_Toc44)

[C. UC-03: Di chuyển đến một điểm bất kỳ trên bản đồ đã quét](#_Toc45)

[1. Mô tả use case](#_Toc46)

[2. Lược đồ tuần tự](#_Toc47)

[3. Lược đồ hoạt động](#_Toc48)

[4. Lược đồ trạng thái](#_Toc49)

[5. Lược đồ lớp ý niệm](#_Toc50)

[6. Phân rã thành phần PM](#_Toc51)

[7. Bảng tham chiếu dò vết](#_Toc52)

[8. Tiêu chí kiểm thử](#_Toc53)

# GIỚI THIỆU VÀ CƠ SỞ KHOA HỌC

## Giới thiệu đề tài

### Mục đích

Trong bối cảnh Cách mạng Công nghiệp 4.0, robot tự hành (Autonomous
Mobile Robot - AMR) ngày càng đóng vai trò quan trọng trong nhiều lĩnh
vực như công nghiệp, logistics, dịch vụ và y tế. Để một robot có thể
hoạt động thông minh, năng lực cốt lõi cần được đáp ứng là khả năng tự
nhận thức không gian thông qua định vị và lập bản đồ.

Hiện nay, các hệ thống robot tích hợp SLAM (Simultaneous Localization
and Mapping) thường yêu cầu năng lực xử lý lớn, kéo theo chi phí phần
cứng cao như máy tính công nghiệp hoặc các nền tảng nhúng mạnh. Vì vậy,
việc nghiên cứu, ứng dụng và tối ưu các thuật toán này trên nền tảng vi
điều khiển nhúng giá rẻ, tiết kiệm năng lượng như ESP32 là một hướng
tiếp cận có tính thách thức nhưng mang lại giá trị thực tiễn cao.

Đề tài xây dựng mô hình robot tự hành tích hợp công nghệ SLAM nhằm giải
quyết bài toán định vị, lập bản đồ và điều hướng trên một nền tảng phần
cứng nhỏ gọn. ESP32-CAM được sử dụng để stream video giám sát theo thời
gian thực. Đề tài không chỉ có khả năng ứng dụng trong robot giám sát,
robot phục vụ thông minh mà còn giúp nhóm vận dụng tổng hợp kiến thức về
lập trình nhúng, xử lý tín hiệu cảm biến và điều khiển tự động trên
thiết bị biên.

#### Mục tiêu

Đề tài hướng đến việc thiết kế, chế tạo và lập trình hoàn chỉnh một mô
hình robot tự hành thu nhỏ, hoạt động ổn định với chế độ cốt lõi SLAM và
khả năng stream video giám sát. Các mục tiêu chính gồm:

**Mục tiêu 1 --- Thiết kế phần cứng và cơ điện tử:** Thiết kế, lắp ráp
khung xe 4 bánh sử dụng động cơ DC tích hợp encoder, được điều khiển bởi
vi điều khiển trung tâm ESP32. Xây dựng hệ thống quản lý năng lượng ổn
định bằng mạch hạ áp (buck converter) để cấp nguồn độc lập cho các thành
phần dễ gây nhiễu như servo, động cơ và mạch xử lý.

**Mục tiêu 2 --- Xây dựng chế độ SLAM:** Tích hợp cảm biến Lidar LDS02RR
quét 360 độ và dữ liệu odometry từ encoder. Xây dựng thuật toán giúp
robot tự động quét, lập bản đồ 2D môi trường xung quanh và di chuyển đến
tọa độ đích trong khi hạn chế va chạm với vật cản.

**Mục tiêu 3 --- Stream video giám sát:** Sử dụng module ESP32-CAM đặt
trên cơ cấu pan-tilt gồm hai servo SG90 để thu thập và truyền phát video
theo thời gian thực, phục vụ mục đích giám sát từ xa thông qua giao diện
web.

**Mục tiêu 4 --- Tích hợp và kiểm chứng hệ thống:** Đảm bảo robot có thể
chuyển đổi linh hoạt giữa các chế độ, xử lý dữ liệu theo thời gian thực
và đánh giá độ chính xác thông qua thực nghiệm trên mô hình thực tế.

#### Phương pháp tiến hành

##### Tìm hiểu hiện trạng

Khảo sát sự phát triển của robot tự hành trong các lĩnh vực công nghiệp,
logistics, dịch vụ và y tế; đồng thời phân tích nhu cầu tích hợp khả
năng lập bản đồ, điều hướng và tương tác với con người trên các nền tảng
phần cứng nhỏ gọn, chi phí thấp.

##### Tìm hiểu nghiệp vụ và phạm vi ứng dụng

Xác định phạm vi thực hiện của đề tài là mô hình prototype hoạt động
trong môi trường trong nhà, mặt sàn phẳng. Hệ thống Lidar được thiết kế
để hoạt động trong không gian có vách ngăn hoặc vật cản rõ ràng; đề tài
chưa đặt mục tiêu vận hành ngoài trời, trên địa hình gồ ghề hoặc trong
điều kiện môi trường phức tạp.

Đối tượng nghiên cứu bao gồm động học xe 4 bánh dạng
skid-steering/differential drive, thuật toán dung hợp dữ liệu giữa Lidar
và encoder, cùng thuật toán điều khiển hồi tiếp PID cho cơ cấu pan-tilt
và động cơ di chuyển.

##### Tìm hiểu mô hình, phương pháp và công nghệ

Nghiên cứu và áp dụng các hướng tiếp cận sau:

- **Thiết kế từ trên xuống (Top-down design)**: chia hệ thống thành các
  module phần cứng độc lập như khối nguồn, khối cảm biến, khối xử lý và
  khối chấp hành.
- **Lập trình và kiểm thử theo module**: kiểm thử riêng từng chức năng
  như đọc dữ liệu Lidar, đếm xung encoder, điều khiển PID động cơ và cấu
  hình camera trước khi tích hợp vào luồng điều khiển chung.
- **Thực nghiệm trên phần cứng thật**: chạy thử robot trong sa bàn hoặc
  phòng kín để đo sai số odometry, thời gian đáp ứng của pan-tilt và độ
  chính xác của bản đồ 2D.
- Các công nghệ và cơ sở khoa học liên quan được trình bày trong Mục II.

##### Phân tích, thiết kế, hiện thực, đánh giá

Từ kết quả khảo sát và nghiên cứu, tiến hành phân tích yêu cầu hệ thống,
thiết kế kiến trúc phần cứng và phần mềm, hiện thực từng module, tích
hợp toàn hệ thống và đánh giá kết quả qua thực nghiệm. Các tham số điều
khiển, đặc biệt là các hệ số Kp, Ki, Kd của bộ điều khiển PID, được tinh
chỉnh dựa trên kết quả đo lường thực tế nhằm tối ưu khả năng vận hành.

## Cơ sở khoa học

### Tình hình nghiên cứu trong và ngoài nước

#### Tình hình nghiên cứu ngoài nước

Trên thế giới, nhiều tập đoàn công nghệ và logistics đã triển khai các
giải pháp robot tự hành trong giao hàng, giám sát và hỗ trợ con người.
Một số ví dụ tiêu biểu gồm Amazon Scout, robot giao hàng của Starship
Technologies tại các khuôn viên đại học ở Mỹ và châu Âu, hay FedEx Same
Day Bot. Các hệ thống này cho thấy xu hướng ứng dụng robot tự hành trong
thực tế ngày càng phát triển mạnh.

Về mặt học thuật, nhiều công trình nghiên cứu đã được công bố liên quan
đến robot giao hàng tự động chặng cuối, robot di động tránh vật cản và
các phương pháp điều hướng dựa trên cảm biến. Điều này cho thấy các bài
toán SLAM và điều hướng tự động đang là những hướng nghiên cứu được quan
tâm rộng rãi.

#### Tình hình nghiên cứu trong nước

Tại Việt Nam, nghiên cứu và ứng dụng robot tự hành vẫn đang trong giai
đoạn phát triển. Một số nhóm nghiên cứu tại các trường đại học kỹ thuật
đã thực hiện các đề tài về robot tự hành tránh vật cản, xe điều khiển từ
xa qua IoT và robot phục vụ trong môi trường trong nhà.

Tuy nhiên, các nghiên cứu tích hợp đồng thời khả năng tự hành, lập bản
đồ và điều khiển theo thời gian thực trên nền tảng phần cứng giá rẻ vẫn
còn hạn chế. Vì vậy, đề tài có tính thực tiễn, phù hợp với xu hướng phát
triển robot thông minh tại Việt Nam và có thể đóng vai trò nền tảng thử
nghiệm cho các ứng dụng robot trong gia đình, giám sát nội khu hoặc hỗ
trợ con người.

### Công nghệ sử dụng

#### ESP32 --- Vi điều khiển trung tâm

ESP32 được sử dụng làm bộ xử lý trung tâm của robot nhờ ưu điểm giá
thành thấp, tiêu thụ năng lượng thấp, hỗ trợ Wi-Fi/Bluetooth và có đủ
ngoại vi để giao tiếp với cảm biến, encoder, mạch điều khiển động cơ và
các module mở rộng. Việc sử dụng ESP32 giúp đề tài kiểm chứng khả năng
triển khai các bài toán robot thông minh trên nền tảng nhúng hạn chế tài
nguyên.

#### ESP32-CAM --- Stream video giám sát

ESP32-CAM được dùng để truyền phát video theo thời gian thực phục vụ
giám sát từ xa. Module này có kích thước nhỏ, chi phí thấp và phù hợp
với các ứng dụng streaming trên thiết bị biên.

#### Lidar LDS02RR --- Cảm biến quét môi trường

Lidar LDS02RR là cảm biến quét 360 độ được dùng để thu thập khoảng cách
đến các vật cản xung quanh robot. Dữ liệu Lidar đóng vai trò quan trọng
trong bài toán SLAM 2D, giúp robot nhận biết cấu trúc môi trường, xây
dựng bản đồ và hỗ trợ tránh vật cản khi di chuyển.

#### Encoder --- Đo lường chuyển động

Encoder gắn trên động cơ DC được dùng để đo số vòng quay của bánh xe, từ
đó ước lượng quãng đường và hướng di chuyển của robot. Dữ liệu encoder
là thành phần cốt lõi của odometry và được kết hợp với dữ liệu Lidar để
cải thiện độ chính xác trong quá trình định vị.

#### Động cơ DC và mạch điều khiển TB6612

Động cơ DC đảm nhiệm việc tạo chuyển động cho robot. Mạch điều khiển
TB6612 được dùng để điều khiển tốc độ và chiều quay của động cơ thông
qua tín hiệu PWM từ ESP32. Sự kết hợp này cho phép robot thực hiện các
thao tác di chuyển tiến, lùi, rẽ trái, rẽ phải và xoay tại chỗ.

#### Servo SG90 và cơ cấu pan-tilt

Hai servo SG90 được dùng để tạo cơ cấu pan-tilt cho camera, cho phép
camera quay theo hai trục ngang và dọc. Cơ cấu này giúp điều chỉnh góc
nhìn camera từ xa thông qua giao diện điều khiển.

#### SLAM 2D và dung hợp cảm biến

SLAM 2D là cơ sở thuật toán giúp robot vừa định vị vị trí của mình, vừa
xây dựng bản đồ môi trường xung quanh. Trong đề tài, dữ liệu từ Lidar và
odometry được dung hợp để nâng cao độ tin cậy của quá trình định vị. Bản
đồ 2D thu được là cơ sở để robot xác định vật cản và lập kế hoạch di
chuyển đến vị trí mục tiêu.

#### Buck Converter --- Quản lý nguồn

Mạch hạ áp buck converter được sử dụng để cung cấp các mức điện áp ổn
định cho từng khối trong hệ thống. Việc tách nguồn cho động cơ, servo và
mạch xử lý giúp giảm nhiễu, hạn chế sụt áp và tăng độ ổn định khi robot
vận hành.

#### Phần mềm điều khiển và giao diện web

Hệ thống phần mềm được chia thành ba tầng chính: firmware nhúng,
middleware ROS 2 và giao diện web điều khiển.

##### Firmware nhúng (PlatformIO + micro-ROS)

Firmware được phát triển trên nền tảng PlatformIO với framework Arduino,
sử dụng thư viện micro-ROS để tích hợp ESP32 vào hệ sinh thái ROS 2
Humble thông qua giao thức WiFi UDP. ESP32 Main đóng vai trò micro-ROS
node, publish các topic `/scan` (LaserScan), `/odom` (Odometry),
`/imu/data_raw` (Imu) và subscribe `/cmd_vel` (Twist) để nhận lệnh điều
khiển từ tầng trên. ESP32-CAM cung cấp luồng MJPEG HTTP trên cổng 80,
được bridge vào ROS thông qua node trung gian trên máy tính.

Firmware được tổ chức theo kiến trúc module: mỗi ngoại vi (motor,
encoder, lidar, IMU, servo) có file source riêng biệt, giao tiếp qua
interface chung trong `ros_bridge`. Cơ chế safety watchdog tự động dừng
động cơ khi mất kết nối với micro-ROS agent, đảm bảo an toàn vận hành.

##### Middleware ROS 2

Tầng middleware chạy trên máy tính đồng hành (laptop hoặc SBC), bao gồm
các node ROS 2 Humble: micro-ROS agent (cầu nối UDP giữa ESP32 và ROS
graph), SLAM Toolbox (xây dựng bản đồ 2D từ dữ liệu `/scan` và TF
odometry), Nav2 stack (lập đường đi và điều hướng tự động) và
rosbridge_server (WebSocket gateway cho giao diện web). Kiến trúc này
cho phép tận dụng sức mạnh tính toán của máy tính cho các thuật toán
SLAM và navigation trong khi ESP32 chỉ đảm nhiệm thu thập dữ liệu cảm
biến và điều khiển cơ cấu chấp hành.

##### Giao diện web điều khiển (Next.js + roslibjs)

Giao diện điều khiển được xây dựng dưới dạng ứng dụng web single-page sử
dụng Next.js 16, React 19 và TypeScript. Giao tiếp với ROS 2 thông qua
thư viện roslibjs kết nối WebSocket đến rosbridge_server. Quản lý trạng
thái ứng dụng bằng Zustand với các store chuyên biệt cho từng chức năng:
kết nối ROS, chế độ vận hành, bản đồ, điều hướng và khám phá tự động.

Giao diện cung cấp các thành phần tương tác chính:

- **Joystick ảo và điều khiển bàn phím**: publish lệnh `/cmd_vel` để
  điều khiển robot di chuyển thủ công trong chế độ Mapping.
- **Bản đồ occupancy grid thời gian thực**: render dữ liệu từ topic
  `/map` dưới dạng canvas 2D, hiển thị vị trí robot và đường đi đã lập.
- **Radar LiDAR**: trực quan hóa dữ liệu quét `/scan` dạng biểu đồ cực.
- **Stream camera**: hiển thị luồng MJPEG từ ESP32-CAM với điều khiển
  pan-tilt servo qua topic `/servo_cmd`.
- **Bảng điều khiển chế độ**: chuyển đổi giữa Mapping, Auto Exploration
  và Navigation; quản lý lưu/tải bản đồ.
- **Đặt điểm đích trên bản đồ**: click chọn tọa độ mục tiêu, gửi action
  `NavigateToPose` đến Nav2 và hiển thị tiến trình điều hướng.
- **Nút dừng khẩn cấp**: publish lệnh dừng tức thì đến robot.

Giao diện được thiết kế responsive, hỗ trợ thao tác trên cả máy tính và
thiết bị di động, cho phép người vận hành giám sát và điều khiển robot
từ xa thông qua trình duyệt web mà không cần cài đặt phần mềm chuyên
dụng.

# Thiết kế phần cứng

## Khối cảm biến và xử lý dữ liệu

### Mạch vi điều khiển trung tâm

![](media/image2.png)

- **Tên linh kiện:** Mạch phát triển ESP32.
- **Mã linh kiện:** ESP32 DevKit V1.
- **Nhà sản xuất:** Espressif Systems.
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 3.3V.
  - Vi xử lý: Tensilica Xtensa Dual-Core 32-bit LX6, xung nhịp 240 MHz.
  - Kết nối: Wi-Fi 802.11 b/g/n, Bluetooth v4.2 BR/EDR và BLE.
  - Giao tiếp: I2C, SPI, UART, PWM, ADC, DAC.
- **Chức năng trong hệ thống:** Đóng vai trò là bộ não trung tâm để điều
  khiển xe tự hành bằng vi điều khiển nhúng. Linh kiện này được chọn nhờ
  tích hợp sẵn WiFi, hỗ trợ giao tiếp không dây và xây dựng hệ thống
  thông báo, đồng thời có đủ năng lực xử lý các thuật toán điều khiển.
- **Giá thành:** \~120.000 VNĐ (Nguồn: Shopee/Các cửa hàng linh kiện
  điện tử).
- **So sánh & Đánh giá:** So với Arduino Uno, ESP32 vượt trội hơn về tốc
  độ xử lý và khả năng kết nối IoT, hoàn toàn phù hợp với yêu cầu giám
  sát theo thời gian thực của hệ thống.

### Cảm biến khoảng cách

![](media/image3.png)

- **Tên linh kiện:** Cảm biến LiDAR.
- **Mã linh kiện:** LiDAR LDS02RR.
- **Nhà sản xuất:** Roborock/Xiaomi (Thường được tháo máy từ robot hút
  bụi).
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 5V DC.
  - Giao tiếp: UART.
  - Phạm vi quét: 360 độ (khi có động cơ quay).
- **Chức năng trong hệ thống:** Quét môi trường xung quanh để phát hiện
  và né tránh vật cản. Được kết hợp với cơ cấu servo để quét vật cản
  hình quạt và đưa ra quyết định né tránh phù hợp.
- **Giá thành:** \~250.000 VNĐ (Nguồn: Shopee).
- **So sánh & Đánh giá:** So với cảm biến siêu âm HC-SR04, LiDAR LDS02RR
  cung cấp độ phân giải góc và độ chính xác cao hơn rất nhiều, giúp xe
  lập bản đồ và né tránh chướng ngại vật mượt mà hơn.

### Cảm biến quán tính

![](media/image4.png)

- **Tên linh kiện:** Cảm biến gia tốc/góc nghiêng.
- **Mã linh kiện:** MPU6050.
- **Nhà sản xuất:** InvenSense.
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 3.3V - 5V.
  - Tích hợp: Gia tốc kế 3 trục (3-axis Accelerometer) và con quay hồi
    chuyển 3 trục (3-axis Gyroscope).
  - Giao tiếp: I2C.
- **Chức năng trong hệ thống:** Giúp robot biết hướng xoay chính xác.
- **Giá thành:** \~35.000 VNĐ (Nguồn: Linh kiện điện tử Nshop/Shopee).
- **So sánh & Đánh giá:** Đây là module 6-DoF tiêu chuẩn, giá thành rẻ
  và dễ tích hợp hơn so với dòng MPU9250 (9-DoF), hoàn toàn đáp ứng đủ
  nhu cầu xác định góc xoay trên mặt phẳng trong nhà hoặc sân bằng
  phẳng.

### Động cơ truyền động chính

![](media/image5.png)

- **Tên linh kiện:** Động cơ DC có Encoder.
- **Số lượng:** 2.
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 6V - 12V DC.
  - Tích hợp Encoder: Cung cấp xung phản hồi để đo tốc độ và quãng
    đường.
- **Chức năng trong hệ thống:** Truyền động cho hệ thống di chuyển của
  xe; tín hiệu từ encoder giúp ESP32 chạy thuật toán PID để ổn định tốc
  độ và điều hướng xe đi thẳng hoặc xoay góc chính xác.
- **Giá thành:** \~150.000 VNĐ/cái (Tổng: 300.000 VNĐ).

## Khối Động lực & Điều khiển

### Module điều khiển động cơ

![](media/image6.png)

- **Tên linh kiện:** Mạch cầu H.
- **Mã linh kiện:** TB6612FNG.
- **Nhà sản xuất:** Toshiba (Chip IC).
- **Thông số kỹ thuật chính:**
  - Điện áp logic: 2.7V - 5.5V.
  - Điện áp cấp cho động cơ (VM): Tối đa 15V.
  - Dòng tải: 1.2A liên tục trên mỗi kênh.
- **Chức năng trong hệ thống:** Điều khiển 2 động cơ cùng lúc. Nhận tín
  hiệu PWM từ ESP32 để tiến, lùi và điều tốc cho 2 động cơ DC.
- **Giá thành:** \~40.000 VNĐ.
- **So sánh & Đánh giá:** TB6612 sử dụng công nghệ MOSFET nên ít sinh
  nhiệt, hiệu suất cao và sụt áp thấp hơn đáng kể so với mạch cầu H
  L298N cũ kỹ.

### Khung gầm và Bánh xe

![](media/image7.png)

- **Tên linh kiện:** Khung xe Robot (Chassis) và hệ thống bánh.
- **Số lượng:** 1 bộ khung, 4 bánh xe dẫn động, 1 bánh xe dẫn hướng.
- **Chức năng trong hệ thống:** Tạo kết cấu cơ khí vững chắc để lắp đặt
  toàn bộ mạch điện, khoang chứa hàng và chịu tải trọng của kiện hàng.
- **Giá thành:** \~250.000 VNĐ (Tùy thuộc vào vật liệu mica hay nhôm).

## Khối Nguồn

### Cấp nguồn chính

![](media/image8.png)

- **Tên linh kiện:** Pin Li-ion và Đế giữ pin.
- **Mã linh kiện:** Pin 18650.
- **Số lượng:** 4 Pin Li-ion 18650, 2 Đế lò xo giữ pin.
- **Thông số kỹ thuật chính:**
  - Điện áp định mức: 3.7V/cell (Tổng điện áp khi mắc nối tiếp có thể
    đạt 7.4V đến 14.8V tùy sơ đồ kết nối).
  - Dung lượng: \~2500mAh - 3000mAh.
- **Chức năng trong hệ thống:** Cung cấp toàn bộ năng lượng cho vi điều
  khiển, động cơ, servo và module nhận diện khuôn mặt ESP32-CAM.
- **Giá thành:** \~200.000 VNĐ (cho 4 cell pin) + 30.000 VNĐ (đế pin).

### Module ổn áp

![](media/image9.png)

- **Tên linh kiện:** Mạch hạ áp.
- **Mã linh kiện:** LM2596.
- **Thông số kỹ thuật chính:**
  - Điện áp đầu vào: 3.2V - 40V.
  - Điện áp đầu ra: 1.25V - 35V (Điều chỉnh bằng biến trở).
  - Dòng tải tối đa: 3A.
- **Chức năng trong hệ thống:** Hạ áp từ nguồn Pin Li-ion (thường \>7V)
  xuống mức điện áp an toàn và ổn định (như 5V) để cấp nguồn cho ESP32,
  LiDAR và các module cảm biến khác tránh hiện tượng cháy nổ.
- **Giá thành:** \~20.000 VNĐ.

## ĐÁNH GIÁ, SO SÁNH VÀ TỔNG HỢP HỆ THỐNG

### Sơ đồ nguyên lý hệ thống

Hệ thống được thiết kế theo kiến trúc phân tán module để dễ dàng khắc
phục sự cố và nâng cấp. Sơ đồ khối nguyên lý kết nối (System Block
Diagram) hoạt động như sau:

- **Khối Nguồn:** Cụm 4 pin Li-ion 18650 (mắc nối tiếp/song song tùy cấu
  hình, giả sử cung cấp \~7.4V - 11.1V) sẽ cấp nguồn áp cao trực tiếp
  cho chân VM của mạch cầu H TB6612 để lai dắt động cơ. Đồng thời, nguồn
  này đi qua module hạ áp **LM2596** để ghim ở mức 5V ổn định, cấp cho
  ESP32, module nhận diện khuôn mặt ESP32-CAM và cảm biến LiDAR.
- **Khối Cảm biến:** MPU6050 giao tiếp với ESP32 qua chuẩn **I2C** (chân
  SDA, SCL). LiDAR LDS02RR giao tiếp qua chuẩn **UART** (TX/RX) để liên
  tục gửi mảng dữ liệu quét 360 độ. ESP32-CAM hoạt động độc lập để xử lý
  hình ảnh sinh trắc học và gửi tín hiệu xác thực mở khóa khoang hàng về
  ESP32 trung tâm.
- **Khối Chấp hành:** ESP32 xuất các xung **PWM** sang TB6612 để điều
  tốc 2 động cơ DC. Các kênh Encoder A/B từ động cơ phản hồi tín hiệu về
  các chân ngắt (Interrupt) của ESP32 để thực hiện vòng lặp hồi tiếp
  PID, giúp xe đi thẳng và rẽ chính xác.

![](media/image10.png)

### Trích dẫn Datasheet các linh kiện chính

Trong quá trình thiết kế sơ đồ nguyên lý và lập trình, nhóm sử dụng tài
liệu thông số kỹ thuật (Datasheet) chính hãng làm chuẩn:

1.  **ESP32-WROOM-32 (Espressif Systems):**
    <https://documentation.espressif.com/esp32-wroom-32_datasheet_en.pdf>
2.  **MPU-6050 (InvenSense):**\
    <https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf>.
3.  **TB6612FNG (Adafruit):**\
    <https://cdn-shop.adafruit.com/datasheets/TB6612FNG_datasheet_en_20121101.pdf>
4.  **LM2596:**\
    <https://www.ti.com/lit/ds/symlink/lm2596.pdf>
5.  **Lidar Lds02rr**:\
    <https://github.com/ROBOTIS-GIT/emanual/blob/master/docs/en/platform/turtlebot3/more_info/appendix_lds_02.md>

### So sánh và Lựa chọn giải pháp

Để tối ưu hóa cho bài toán xe giao hàng chặng cuối, các linh kiện đã
được cân nhắc kỹ lưỡng qua các tiêu chí sau:

- **Bộ xử lý trung tâm (ESP32 vs. Arduino Mega 2560 vs. Raspberry Pi
  4):**
  - *Arduino Mega* có nhiều chân I/O nhưng không có sẵn WiFi/Bluetooth,
    tốc độ xử lý chậm, khó đáp ứng được yêu cầu giám sát IoT và kết nối
    với Web/App điều khiển.
  - *Raspberry Pi 4* rất mạnh, chạy được hệ điều hành (ROS), tuy nhiên
    tiêu thụ năng lượng lớn, tốn diện tích và chi phí cao gấp nhiều lần.
  - *Kết luận:* **ESP32** là sự lựa chọn hoàn hảo, vừa có xung nhịp cao
    (240MHz) đủ chạy PID và giải thuật định hướng, vừa tích hợp sẵn kết
    nối không dây phục vụ IoT với mức giá cực kỳ rẻ.
- **Mạch điều khiển động cơ (TB6612 vs. L298N):**
  - *L298N:* Sử dụng công nghệ Transistor lưỡng cực (BJT), độ sụt áp qua
    IC lớn (khoảng 2V-4V) dẫn đến hao phí điện năng dưới dạng nhiệt rất
    nhiều (cần tản nhiệt to).
  - *TB6612:* Sử dụng MOSFET, độ sụt áp cực kỳ thấp, hiệu suất cao giúp
    tiết kiệm pin cho xe tự hành. Kích thước module rất nhỏ gọn.
  - *Kết luận:* Chọn **TB6612**.
- **Cảm biến né tránh vật cản (LiDAR LDS02RR vs. Siêu âm HC-SR04):**
  - *HC-SR04:* Giá siêu rẻ nhưng chỉ đo được khoảng cách theo một đường
    thẳng phía trước mặt với góc quét hẹp (\~15 độ). Khó bao quát môi
    trường phức tạp.
  - *LiDAR:* Cung cấp mặt cắt 2D của toàn bộ môi trường xung quanh (360
    độ) với độ phân giải cao. Giúp xe giao hàng nhận diện rõ hình dáng
    vật cản để tính toán quỹ đạo lách qua thay vì chỉ dừng lại.
  - *Kết luận:* Chọn **LiDAR** để đảm bảo khả năng tự hành an toàn tuyệt
    đối.

## Bảng Dự Toán Tổng Chi Phí Hệ Thống (Dự kiến)

  ----------------------------------------------------------------------
  STT        Tên thiết bị / Linh    Số      Đơn giá dự     Thành tiền
             kiện                   lượng   kiến (VNĐ)     (VNĐ)
  ---------- ---------------------- ------- -------------- -------------
  1          ESP32 DevKit V1        1       120.000        120.000

  2          LiDAR LDS02RR          1       450.000        250.000

  3          MPU6050                1       35.000         35.000

  4          Động cơ DC có Encoder  2       150.000        300.000

  5          Mạch cầu H TB6612      1       40.000         40.000

  6          Khung xe Robot         1 bộ    200.000        200.000
             (Chassis)                                     

  7          Bánh xe dẫn động       2       25.000         100.000

  8          Bánh xe dẫn hướng      1       20.000         20.000

  9          Pin Li-ion 18650       6       50.000         200.000

  10         Đế lò xo giữ pin       3       15.000         30.000

  11         Mạch hạ áp LM2596      2       20.000         40.000

  12         Servo SG90 (cho        1       25.000         25.000
             pan-tilt camera)                              

  13         ESP32-CAM              1       150.000        150.000

  **Tổng**   **Chi phí phần cứng cơ                        **\~
             bản**                                         1.315.000**
  ----------------------------------------------------------------------

# Thiết kế phần cứng

## Khối cảm biến và xử lý dữ liệu

### Mạch vi điều khiển trung tâm

![](media/image2.png)

- **Tên linh kiện:** Mạch phát triển ESP32.
- **Mã linh kiện:** ESP32 DevKit V1.
- **Nhà sản xuất:** Espressif Systems.
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 3.3V.
  - Vi xử lý: Tensilica Xtensa Dual-Core 32-bit LX6, xung nhịp 240 MHz.
  - Kết nối: Wi-Fi 802.11 b/g/n, Bluetooth v4.2 BR/EDR và BLE.
  - Giao tiếp: I2C, SPI, UART, PWM, ADC, DAC.
- **Chức năng trong hệ thống:** Đóng vai trò là bộ não trung tâm để điều
  khiển xe tự hành bằng vi điều khiển nhúng. Linh kiện này được chọn nhờ
  tích hợp sẵn WiFi, hỗ trợ giao tiếp không dây và xây dựng hệ thống
  thông báo, đồng thời có đủ năng lực xử lý các thuật toán điều khiển.
- **Giá thành:** \~120.000 VNĐ (Nguồn: Shopee/Các cửa hàng linh kiện
  điện tử).
- **So sánh & Đánh giá:** So với Arduino Uno, ESP32 vượt trội hơn về tốc
  độ xử lý và khả năng kết nối IoT, hoàn toàn phù hợp với yêu cầu giám
  sát theo thời gian thực của hệ thống.

### Cảm biến khoảng cách

![](media/image3.png)

- **Tên linh kiện:** Cảm biến LiDAR.
- **Mã linh kiện:** LiDAR LDS02RR.
- **Nhà sản xuất:** Roborock/Xiaomi (Thường được tháo máy từ robot hút
  bụi).
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 5V DC.
  - Giao tiếp: UART.
  - Phạm vi quét: 360 độ (khi có động cơ quay).
- **Chức năng trong hệ thống:** Quét môi trường xung quanh để phát hiện
  và né tránh vật cản. Được kết hợp với cơ cấu servo để quét vật cản
  hình quạt và đưa ra quyết định né tránh phù hợp.
- **Giá thành:** \~250.000 VNĐ (Nguồn: Shopee).
- **So sánh & Đánh giá:** So với cảm biến siêu âm HC-SR04, LiDAR LDS02RR
  cung cấp độ phân giải góc và độ chính xác cao hơn rất nhiều, giúp xe
  lập bản đồ và né tránh chướng ngại vật mượt mà hơn.

### Cảm biến quán tính

![](media/image4.png)

- **Tên linh kiện:** Cảm biến gia tốc/góc nghiêng.
- **Mã linh kiện:** MPU6050.
- **Nhà sản xuất:** InvenSense.
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 3.3V - 5V.
  - Tích hợp: Gia tốc kế 3 trục (3-axis Accelerometer) và con quay hồi
    chuyển 3 trục (3-axis Gyroscope).
  - Giao tiếp: I2C.
- **Chức năng trong hệ thống:** Giúp robot biết hướng xoay chính xác.
- **Giá thành:** \~35.000 VNĐ (Nguồn: Linh kiện điện tử Nshop/Shopee).
- **So sánh & Đánh giá:** Đây là module 6-DoF tiêu chuẩn, giá thành rẻ
  và dễ tích hợp hơn so với dòng MPU9250 (9-DoF), hoàn toàn đáp ứng đủ
  nhu cầu xác định góc xoay trên mặt phẳng trong nhà hoặc sân bằng
  phẳng.

### Động cơ truyền động chính

![](media/image5.png)

- **Tên linh kiện:** Động cơ DC có Encoder.
- **Số lượng:** 2.
- **Thông số kỹ thuật chính:**
  - Điện áp hoạt động: 6V - 12V DC.
  - Tích hợp Encoder: Cung cấp xung phản hồi để đo tốc độ và quãng
    đường.
- **Chức năng trong hệ thống:** Truyền động cho hệ thống di chuyển của
  xe; tín hiệu từ encoder giúp ESP32 chạy thuật toán PID để ổn định tốc
  độ và điều hướng xe đi thẳng hoặc xoay góc chính xác.
- **Giá thành:** \~150.000 VNĐ/cái (Tổng: 300.000 VNĐ).

## Khối Động lực & Điều khiển

### Module điều khiển động cơ

![](media/image6.png)

- **Tên linh kiện:** Mạch cầu H.
- **Mã linh kiện:** TB6612FNG.
- **Nhà sản xuất:** Toshiba (Chip IC).
- **Thông số kỹ thuật chính:**
  - Điện áp logic: 2.7V - 5.5V.
  - Điện áp cấp cho động cơ (VM): Tối đa 15V.
  - Dòng tải: 1.2A liên tục trên mỗi kênh.
- **Chức năng trong hệ thống:** Điều khiển 2 động cơ cùng lúc. Nhận tín
  hiệu PWM từ ESP32 để tiến, lùi và điều tốc cho 2 động cơ DC.
- **Giá thành:** \~40.000 VNĐ.
- **So sánh & Đánh giá:** TB6612 sử dụng công nghệ MOSFET nên ít sinh
  nhiệt, hiệu suất cao và sụt áp thấp hơn đáng kể so với mạch cầu H
  L298N cũ kỹ.

### Khung gầm và Bánh xe

![](media/image7.png)

- **Tên linh kiện:** Khung xe Robot (Chassis) và hệ thống bánh.
- **Số lượng:** 1 bộ khung, 4 bánh xe dẫn động, 1 bánh xe dẫn hướng.
- **Chức năng trong hệ thống:** Tạo kết cấu cơ khí vững chắc để lắp đặt
  toàn bộ mạch điện, khoang chứa hàng và chịu tải trọng của kiện hàng.
- **Giá thành:** \~250.000 VNĐ (Tùy thuộc vào vật liệu mica hay nhôm).

## Khối Nguồn

### Cấp nguồn chính

![](media/image8.png)

- **Tên linh kiện:** Pin Li-ion và Đế giữ pin.
- **Mã linh kiện:** Pin 18650.
- **Số lượng:** 4 Pin Li-ion 18650, 2 Đế lò xo giữ pin.
- **Thông số kỹ thuật chính:**
  - Điện áp định mức: 3.7V/cell (Tổng điện áp khi mắc nối tiếp có thể
    đạt 7.4V đến 14.8V tùy sơ đồ kết nối).
  - Dung lượng: \~2500mAh - 3000mAh.
- **Chức năng trong hệ thống:** Cung cấp toàn bộ năng lượng cho vi điều
  khiển, động cơ, servo và module nhận diện khuôn mặt ESP32-CAM.
- **Giá thành:** \~200.000 VNĐ (cho 4 cell pin) + 30.000 VNĐ (đế pin).

### Module ổn áp

![](media/image9.png)

- **Tên linh kiện:** Mạch hạ áp.
- **Mã linh kiện:** LM2596.
- **Thông số kỹ thuật chính:**
  - Điện áp đầu vào: 3.2V - 40V.
  - Điện áp đầu ra: 1.25V - 35V (Điều chỉnh bằng biến trở).
  - Dòng tải tối đa: 3A.
- **Chức năng trong hệ thống:** Hạ áp từ nguồn Pin Li-ion (thường \>7V)
  xuống mức điện áp an toàn và ổn định (như 5V) để cấp nguồn cho ESP32,
  LiDAR và các module cảm biến khác tránh hiện tượng cháy nổ.
- **Giá thành:** \~20.000 VNĐ.

## ĐÁNH GIÁ, SO SÁNH VÀ TỔNG HỢP HỆ THỐNG

### Sơ đồ nguyên lý hệ thống

Hệ thống được thiết kế theo kiến trúc phân tán module để dễ dàng khắc
phục sự cố và nâng cấp. Sơ đồ khối nguyên lý kết nối (System Block
Diagram) hoạt động như sau:

- **Khối Nguồn:** Cụm 4 pin Li-ion 18650 (mắc nối tiếp/song song tùy cấu
  hình, giả sử cung cấp \~7.4V - 11.1V) sẽ cấp nguồn áp cao trực tiếp
  cho chân VM của mạch cầu H TB6612 để lai dắt động cơ. Đồng thời, nguồn
  này đi qua module hạ áp **LM2596** để ghim ở mức 5V ổn định, cấp cho
  ESP32, module nhận diện khuôn mặt ESP32-CAM và cảm biến LiDAR.
- **Khối Cảm biến:** MPU6050 giao tiếp với ESP32 qua chuẩn **I2C** (chân
  SDA, SCL). LiDAR LDS02RR giao tiếp qua chuẩn **UART** (TX/RX) để liên
  tục gửi mảng dữ liệu quét 360 độ. ESP32-CAM hoạt động độc lập để xử lý
  hình ảnh sinh trắc học và gửi tín hiệu xác thực mở khóa khoang hàng về
  ESP32 trung tâm.
- **Khối Chấp hành:** ESP32 xuất các xung **PWM** sang TB6612 để điều
  tốc 2 động cơ DC. Các kênh Encoder A/B từ động cơ phản hồi tín hiệu về
  các chân ngắt (Interrupt) của ESP32 để thực hiện vòng lặp hồi tiếp
  PID, giúp xe đi thẳng và rẽ chính xác.

![](media/image10.png)

### Trích dẫn Datasheet các linh kiện chính

Trong quá trình thiết kế sơ đồ nguyên lý và lập trình, nhóm sử dụng tài
liệu thông số kỹ thuật (Datasheet) chính hãng làm chuẩn:

1.  **ESP32-WROOM-32 (Espressif Systems):**
    <https://documentation.espressif.com/esp32-wroom-32_datasheet_en.pdf>
2.  **MPU-6050 (InvenSense):**\
    <https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf>.
3.  **TB6612FNG (Adafruit):**\
    <https://cdn-shop.adafruit.com/datasheets/TB6612FNG_datasheet_en_20121101.pdf>
4.  **LM2596:**\
    <https://www.ti.com/lit/ds/symlink/lm2596.pdf>
5.  **Lidar Lds02rr**:\
    <https://github.com/ROBOTIS-GIT/emanual/blob/master/docs/en/platform/turtlebot3/more_info/appendix_lds_02.md>

### So sánh và Lựa chọn giải pháp

Để tối ưu hóa cho bài toán xe giao hàng chặng cuối, các linh kiện đã
được cân nhắc kỹ lưỡng qua các tiêu chí sau:

- **Bộ xử lý trung tâm (ESP32 vs. Arduino Mega 2560 vs. Raspberry Pi
  4):**
  - *Arduino Mega* có nhiều chân I/O nhưng không có sẵn WiFi/Bluetooth,
    tốc độ xử lý chậm, khó đáp ứng được yêu cầu giám sát IoT và kết nối
    với Web/App điều khiển.
  - *Raspberry Pi 4* rất mạnh, chạy được hệ điều hành (ROS), tuy nhiên
    tiêu thụ năng lượng lớn, tốn diện tích và chi phí cao gấp nhiều lần.
  - *Kết luận:* **ESP32** là sự lựa chọn hoàn hảo, vừa có xung nhịp cao
    (240MHz) đủ chạy PID và giải thuật định hướng, vừa tích hợp sẵn kết
    nối không dây phục vụ IoT với mức giá cực kỳ rẻ.
- **Mạch điều khiển động cơ (TB6612 vs. L298N):**
  - *L298N:* Sử dụng công nghệ Transistor lưỡng cực (BJT), độ sụt áp qua
    IC lớn (khoảng 2V-4V) dẫn đến hao phí điện năng dưới dạng nhiệt rất
    nhiều (cần tản nhiệt to).
  - *TB6612:* Sử dụng MOSFET, độ sụt áp cực kỳ thấp, hiệu suất cao giúp
    tiết kiệm pin cho xe tự hành. Kích thước module rất nhỏ gọn.
  - *Kết luận:* Chọn **TB6612**.
- **Cảm biến né tránh vật cản (LiDAR LDS02RR vs. Siêu âm HC-SR04):**
  - *HC-SR04:* Giá siêu rẻ nhưng chỉ đo được khoảng cách theo một đường
    thẳng phía trước mặt với góc quét hẹp (\~15 độ). Khó bao quát môi
    trường phức tạp.
  - *LiDAR:* Cung cấp mặt cắt 2D của toàn bộ môi trường xung quanh (360
    độ) với độ phân giải cao. Giúp xe giao hàng nhận diện rõ hình dáng
    vật cản để tính toán quỹ đạo lách qua thay vì chỉ dừng lại.
  - *Kết luận:* Chọn **LiDAR** để đảm bảo khả năng tự hành an toàn tuyệt
    đối.

## Bảng Dự Toán Tổng Chi Phí Hệ Thống (Dự kiến)

  ----------------------------------------------------------------------
  STT        Tên thiết bị / Linh    Số      Đơn giá dự     Thành tiền
             kiện                   lượng   kiến (VNĐ)     (VNĐ)
  ---------- ---------------------- ------- -------------- -------------
  1          ESP32 DevKit V1        1       120.000        120.000

  2          LiDAR LDS02RR          1       450.000        250.000

  3          MPU6050                1       35.000         35.000

  4          Động cơ DC có Encoder  2       150.000        300.000

  5          Mạch cầu H TB6612      1       40.000         40.000

  6          Khung xe Robot         1 bộ    200.000        200.000
             (Chassis)                                     

  7          Bánh xe dẫn động       2       25.000         100.000

  8          Bánh xe dẫn hướng      1       20.000         20.000

  9          Pin Li-ion 18650       6       50.000         200.000

  10         Đế lò xo giữ pin       3       15.000         30.000

  11         Mạch hạ áp LM2596      2       20.000         40.000

  12         Servo SG90 (cho        1       25.000         25.000
             pan-tilt camera)                              

  13         ESP32-CAM              1       150.000        150.000

  **Tổng**   **Chi phí phần cứng cơ                        **\~
             bản**                                         1.315.000**
  ----------------------------------------------------------------------

# Phân tích và thiết kế hệ thống

## Tổng quan kiến trúc ROS2

SLAM Tracking Car là hệ thống ROS2 Humble gồm bốn tầng chức năng, trao
đổi dữ liệu với nhau qua lớp truyền tin DDS (CycloneDDS):

1.  **Tầng giao diện người dùng (Web Dashboard)** --- Trang web dựng
    bằng Next.js cùng thư viện `roslib.js`, kết nối tới ROS thông qua
    máy chủ `rosbridge` chạy giao thức WebSocket ở cổng 9090.
2.  **Tầng ứng dụng ROS2** --- Các nút (node) Python trong hai gói
    `slam_car_perception` và `slam_car_navigation` đảm nhận xử lý ảnh,
    nhận diện người, bám mục tiêu, quản lý bản đồ và điều phối vòng đời
    các nút Nav2.
3.  **Tầng dịch vụ trung gian ROS2** --- Các nút hệ thống có sẵn:
    `slam_toolbox`, các nút `nav2_*`, `explore_lite`,
    `robot_state_publisher`, `robot_localization` (bộ lọc EKF),
    `map_server`, `rosbridge_websocket`, `image_transport`.
4.  **Tầng firmware (ESP32)** --- Hai bo mạch ESP32 chạy micro-ROS, kết
    nối tới máy chủ `micro_ros_agent` qua WiFi UDP.

### Sơ đồ kiến trúc phân tầng

Bốn tầng được xếp theo chiều dọc. Dữ liệu cảm biến đi từ phần cứng lên
trên, lệnh điều khiển đi từ trên xuống phần cứng.

![](media/image11.png)

### Luồng dữ liệu cảm biến và lệnh điều khiển

Để dễ theo dõi, hệ thống được tách thành hai luồng nghiệp vụ riêng.

#### Luồng A --- Lập bản đồ SLAM và Điều hướng tự động

![](media/image12.png)

#### Luồng B --- Theo dõi người và Đăng ký khuôn mặt

![](media/image13.png)

## Giải thích các nút (node)

### Tầng cầu nối (Bridge)

#### `micro_ros_agent` (gói `micro_ros_agent`)

- **Vai trò**: Làm cầu UDP4 giữa firmware ESP32 (chạy micro-ROS) và lớp
  truyền tin DDS của máy chủ ROS2. Lắng nghe ở cổng `8888`, miền
  (domain) số `42`.
- **Khởi chạy bởi**: `robot.launch.py` (mọi chế độ chạy với robot thật).
- **Lưu ý**: Toàn bộ chủ đề (topic) mà bo `ESP32 Main` thu/phát đều phải
  đi qua nút này.

#### `cam_bridge_node` (gói `slam_car_perception`, tệp `cam_bridge_node.py`)

- **Vai trò**: Đọc luồng MJPEG qua HTTP từ `ESP32-CAM` (địa chỉ lấy từ
  `firmware/.env`, mặc định `http://<CAM_IP>:80/stream`), chuyển sang
  kiểu `sensor_msgs/Image` rồi phát ra ROS.
- **Đăng ký nhận (subscribe)**: Không có (kết nối HTTP trực tiếp tới
  camera).
- **Phát (publish)**: `/camera/image_raw`, `/camera_info`.
- **Tham số**: `cam_url`, `frame_id` (mặc định `camera_optical_frame`),
  `fps`, `camera_fov_horizontal_deg`.

#### `rosbridge_websocket` (gói `rosbridge_server`)

- **Vai trò**: Cung cấp giao thức rosbridge dạng JSON ở
  `ws://0.0.0.0:9090`. Trình duyệt dùng `roslib.js` để phát/nhận chủ đề
  và gọi dịch vụ (service), hành động (action).
- **Tham số**: `max_message_size: 10MB` đủ để truyền ảnh nén.
- **Khởi chạy bởi**: `dashboard.launch.py`, `person_tracking.launch.py`.

#### `image_republisher` (gói `image_transport`)

- **Vai trò**: Phát lại `/camera/image_raw` (định dạng BGR8 cỡ \~9
  MB/giây) thành `/camera/image_raw/compressed` (JPEG, \~500 KB/giây) để
  giảm băng thông cho phía web.
- **Tham số**: `compressed.jpeg_quality: 75`.

### Tầng nhận thức (`slam_car_perception`)

#### `enrollment_node` (tệp `enrollment_node.py`)

- **Vai trò**: Đăng ký người mới vào hệ thống nhận diện khuôn mặt. Nhận
  khung ảnh từ webcam của trình duyệt thông qua `rosbridge`, dò khuôn
  mặt bằng YOLOv8n, trích đặc trưng (embedding) bằng InsightFace
  `buffalo_l`, lưu vào cơ sở dữ liệu SQLite.
- **Đăng ký nhận**: `/enrollment/image` (kiểu
  `sensor_msgs/CompressedImage`).
- **Phát**: `/enrollment/status` (kiểu
  `slam_car_interfaces/EnrollmentStatus`).
- **Dịch vụ** (định nghĩa trong `slam_car_interfaces`): `AddPerson`,
  `RemovePerson`, `ListPersons`, `SetTrackingTarget`,
  `GetTrackingTarget`.
- **Lưu trữ**: tệp `~/.slam_car/face_db.sqlite`.

#### `person_tracker_node` (tệp `person_tracker_node.py`)

- **Vai trò**: Phát hiện và nhận diện người trong luồng video của
  ESP32-CAM. Quy trình xử lý: YOLOv8n dò vùng người → InsightFace cắt và
  trích đặc trưng khuôn mặt → so khớp cosine với cơ sở dữ liệu đặc trưng
  → kết hợp với cụm chân người trên `/scan` để ước lượng khoảng cách
  thực tế.
- **Đăng ký nhận**: `/camera/image_raw`, `/camera_info`, `/scan`, các
  phép biến đổi tọa độ TF (`camera_optical_frame` ↔ `laser_link`).
- **Phát**: `/tracked_persons` (kiểu
  `slam_car_interfaces/TrackedPersonArray`).
- **Tự nạp lại**: Theo dõi thời điểm chỉnh sửa cuối (`mtime`) của tệp
  SQLite, nạp lại đặc trưng người khi cơ sở dữ liệu thay đổi.

#### `tracking_controller_node` (tệp `tracking_controller_node.py`)

- **Vai trò**: Điều phối servo (xoay camera) và bánh xe để bám mục tiêu
  đã chọn. Bốn vòng định thời chạy song song: vòng servo 50 Hz, vòng
  bánh xe 10 Hz, vòng kiểm tra mất mục tiêu 10 Hz, vòng cập nhật trạng
  thái 5 Hz.
- **Đăng ký nhận**: `/tracked_persons`, `/joint_states`, `/scan`.
- **Phát**: `/cmd_vel` (kiểu `geometry_msgs/Twist`), `/servo_cmd` (kiểu
  `sensor_msgs/JointState`), `/tracking_controller/status` (kiểu
  `std_msgs/String`).
- **An toàn**: Dừng robot khi mất mục tiêu, tránh va chạm dựa trên
  `/scan`.

### Tầng dịch vụ trung gian ROS2

#### `robot_state_publisher`

- **Vai trò**: Đọc mô tả robot từ tệp URDF (`robot.urdf.xacro`) và phát
  các phép biến đổi tọa độ TF tĩnh giữa các khâu (link) của robot
  (`base_footprint` → `base_link` → `laser_link`, `camera_link`,
  `camera_optical_frame`, ...) cùng tham số `robot_description`.

#### `ekf_filter_node` (gói `robot_localization`)

- **Vai trò**: Hợp nhất `/odom` (từ encoder bánh) với `/imu/data_raw`
  (từ IMU) bằng bộ lọc Kalman mở rộng (EKF) để tạo ra ước lượng tư thế
  ổn định cho khung tọa độ `odom → base_footprint`.
- **Phát**: `/odometry/filtered`, biến đổi TF `odom → base_footprint`.
- **Tham số**: `config/ekf.yaml`.

#### `slam_toolbox` (`async_slam_toolbox_node`)

- **Vai trò**: Lập bản đồ và định vị đồng thời (SLAM) 2D dạng đồ thị
  (graph-based), chạy bất đồng bộ. Tích hợp dữ liệu `/scan` cùng các
  phép biến đổi TF để dựng bản đồ.
- **Phát**: `/map` (kiểu `nav_msgs/OccupancyGrid`), `/map_metadata`,
  biến đổi TF `map → odom`.
- **Dịch vụ**: `/slam_toolbox/serialize_map`, `/slam_toolbox/save_map`,
  `/slam_toolbox/clear_map`.
- **Tham số**: `config/slam_toolbox.yaml`.

#### `explore_lite` (gói `m-explore-ros2`)

- **Vai trò**: Phát hiện đường biên (frontier) giữa vùng đã biết và chưa
  biết trên `/map`, sau đó gửi đích đến cho Nav2 để robot tự khám phá.
  Dashboard có thể bật hoặc tắt thông qua hành động (action).
- **Đăng ký nhận**: `/map`, `/map_updates`.
- **Khách hành động (action client)**: `/navigate_to_pose`.
- **Chủ đề phụ**: `/explore/resume` (kiểu Bool) --- tạm dừng hoặc tiếp
  tục.

#### Cụm Nav2 (các nút có vòng đời)

Khởi động ở trạng thái chưa cấu hình (UNCONFIGURED), được
`map_manager_node` kích hoạt khi chuyển sang chế độ điều hướng.

  -----------------------------------------------------------------------------------------
  Nút                   Vai trò                      Chủ đề / Hành động chính
  --------------------- ---------------------------- --------------------------------------
  `map_server`          Nạp tệp bản đồ `.yaml/.pgm`  `/map`
                        đã lưu, phát ra làm bản đồ   
                        tĩnh.                        

  `amcl`                Định vị bằng phương pháp     nhận `/scan`, `/initialpose`; phát
                        Monte Carlo trên bản đồ có   `/amcl_pose`, biến đổi `map→odom`.
                        sẵn.                         

  `planner_server`      Sinh đường đi tổng thể       hành động `/compute_path_to_pose`.
                        (NavFn / SmacPlanner).       

  `controller_server`   Bộ điều khiển cục bộ (DWB /  hành động `/follow_path`; phát
                        RPP) sinh `/cmd_vel` để bám  `/cmd_vel`.
                        đường đi.                    

  `bt_navigator`        Cây hành vi (behavior tree)  hành động `/navigate_to_pose`,
                        điều phối toàn bộ Nav2.      `/navigate_through_poses`.

  `behavior_server`     Các hành vi cứu nguy (xoay   hành động `/spin`, `/backup`, ...
                        tại chỗ, lùi, chờ, đi theo   
                        hướng).                      

  `lifecycle_manager`   Kích hoạt / hủy kích hoạt    dịch vụ
                        các nút Nav2 (gói            `/lifecycle_manager_*/manage_nodes`.
                        `nav2_lifecycle_manager`).   
  -----------------------------------------------------------------------------------------

#### `map_manager_node` (gói `slam_car_navigation`)

- **Vai trò**: Quản lý chuyển đổi giữa hai chế độ lập bản đồ và điều
  hướng. Liệt kê bản đồ đã lưu, nạp bản đồ vào `map_server` và điều
  khiển vòng đời của cụm Nav2.
- **Dịch vụ**: `/map_manager/list_maps`, `/map_manager/load_map`,
  `/map_manager/set_mode`.

### Tầng firmware (PlatformIO + micro-ROS)

#### `ESP32 Main` (`firmware/src/main.cpp`)

- **Vai trò**: Bo điều khiển trung tâm gồm trình điều khiển động cơ
  (chip TB6612FNG), encoder bánh, cảm biến quán tính IMU (MPU6050),
  LiDAR LDS02RR và servo. Bo này cũng là một nút micro-ROS.
- **Phát**: `/scan` (LaserScan), `/odom` (Odometry), `/imu/data_raw`
  (Imu), `/joint_states` (JointState cho khớp `camera_pan_joint`).
- **Đăng ký nhận**: `/cmd_vel` (Twist) → điều khiển động cơ kiểu PID;
  `/servo_cmd` (JointState) → đặt góc xoay servo.
- **Mô-đun**: `motors`, `encoders`, `imu`, `lidar`, `servos`, `safety`,
  `ros_bridge` (xem đặc tả `firmware-modules`).

#### `ESP32-CAM` (`firmware/src/cam_main.cpp`)

- **Vai trò**: Phát luồng video MJPEG qua máy chủ HTTP cổng 80. Bo này
  không phải nút micro-ROS, mà được `cam_bridge_node` chủ động kéo dữ
  liệu về.
- **Đầu ra**: Điểm cuối HTTP `/stream` (định dạng multipart MJPEG).

## Bảng tổng hợp các tệp khởi chạy (launch file)

  -----------------------------------------------------------------------
  Tệp khởi chạy                       Bao gồm các nút
  ----------------------------------- -----------------------------------
  `robot.launch.py`                   `micro_ros_agent`,
                                      `robot_state_publisher`,
                                      `cam_bridge_node`,
                                      `ekf_filter_node`

  `slam.launch.py`                    nội dung `robot.launch.py` +
                                      `slam_toolbox` + `rviz2`

  `navigation.launch.py`              nội dung `robot.launch.py` +
                                      `nav2_bringup` + `rviz2`

  `simulation.launch.py`              `gazebo`, `robot_state_publisher`,
                                      `ros_gz_bridge`, `rviz2`

  `dashboard.launch.py`               nội dung `robot.launch.py` +
                                      `rosbridge_websocket` +
                                      `image_republisher` +
                                      `map_manager_node` +
                                      `slam_toolbox` + `explore_lite` +
                                      các nút Nav2 có vòng đời
                                      (`map_server`, `amcl`,
                                      `controller_server`,
                                      `planner_server`, `bt_navigator`,
                                      `behavior_server`)

  `person_tracking.launch.py`         nội dung `robot.launch.py` +
                                      `enrollment_node` +
                                      `person_tracker_node` +
                                      `tracking_controller_node` +
                                      `rosbridge_websocket`
  -----------------------------------------------------------------------

## Giao diện tùy biến (`slam_car_interfaces`)

- **Bản tin (message)**: `RobotMode`, `BoundingBox2D`, `EnrolledPerson`,
  `EnrollmentStatus`, `TrackedPerson`, `TrackedPersonArray`.
- **Dịch vụ (service)**: `SetMode`, `ListMaps`, `LoadMap`, `AddPerson`,
  `RemovePerson`, `ListPersons`, `SetTrackingTarget`,
  `GetTrackingTarget`.

## UC-01: Tạo lập bản đồ bằng di chuyển thủ công

### Mô tả use case

  -------------------------------------------------------------
  Mục      Nội dung
  -------- ----------------------------------------------------
  Phụ      Không
  thuộc    

  Mục đích Người vận hành cần khảo sát một không gian mới mà
           robot chưa có bản đồ. PM cho phép người vận hành
           điều khiển robot di chuyển thủ công qua joystick/bàn
           phím, đồng thời xây dựng bản đồ 2D theo thời gian
           thực nhờ SLAM.

  Mô tả    Người vận hành điều khiển robot di chuyển trong
           không gian bằng joystick ảo hoặc phím mũi tên, hệ
           thống sử dụng LiDAR + odometry để xây dựng bản đồ
           occupancy grid theo thời gian thực, sau đó lưu bản
           đồ khi hoàn tất.

  Actor    Người vận hành (Operator)
  chính    

  Actor    SLAM Toolbox (xử lý thuật toán SLAM), ESP32 firmware
  liên     (điều khiển động cơ, đọc encoder, quét LiDAR)
  quan     

  Tiền     1\. Robot đã bật nguồn và kết nối WiFi\
  điều     2. Web dashboard đã kết nối rosbridge (status =
  kiện     connected)\
           3. Hệ thống đang ở chế độ SLAM Mapping

  Dãy lệnh 1\. Người vận hành mở web dashboard và xác nhận kết
  thực     nối ROS thành công\
  hiện     2. Người vận hành chọn chế độ "Mapping" trên Mode
  bình     Controller\
  thường   3. Người vận hành sử dụng joystick ảo hoặc phím mũi
           tên để điều khiển robot di chuyển\
           4. Hệ thống publish /cmd_vel → ESP32 điều khiển động
           cơ\
           5. ESP32 publish /scan (LiDAR) + /odom (encoder) →
           SLAM Toolbox xây dựng bản đồ\
           6. Bản đồ occupancy grid được hiển thị real-time
           trên dashboard qua topic /map\
           7. Người vận hành di chuyển robot khắp không gian
           cần quét\
           8. Người vận hành nhấn "Save Map" và nhập tên bản
           đồ\
           9. Hệ thống gọi service /slam_toolbox/serialize_map
           để lưu bản đồ

  Hậu điều Bản đồ 2D (file .yaml + .pgm) được lưu trong thư mục
  kiện     maps, sẵn sàng sử dụng cho chế độ Navigation
  (thành   
  công)    

  Hậu điều Bản đồ không được lưu, dữ liệu SLAM trong bộ nhớ vẫn
  kiện     còn (có thể thử lưu lại). Robot dừng di chuyển an
  (thất    toàn.
  bại)     

  Xử lý    Mất kết nối rosbridge → Dashboard hiển thị lỗi,
  ngoại lệ robot dừng (safety timeout)\
           Robot va chạm vật cản → Người vận hành dừng
           joystick, lùi lại\
           Lưu bản đồ thất bại → Hiển thị thông báo lỗi, cho
           phép thử lại
  -------------------------------------------------------------

### Lược đồ tuần tự

![](media/image14.png)

### Lược đồ hoạt động

![](media/image15.png)

### Lược đồ trạng thái

![](media/image16.png)

### Lược đồ lớp ý niệm

![](media/image17.png)

### Phân rã thành phần PM

#### Controller: `DashboardWebApp`

- **Nhiệm vụ**: Nhận input từ người vận hành (joystick/keyboard),
  publish lệnh điều khiển qua rosbridge WebSocket.
- **Topic publish**: `/cmd_vel` (geometry_msgs/Twist)
- **Service call**: `/slam_toolbox/serialize_map`
  (slam_toolbox_msgs/SerializePoseGraph)
- **Input**: Joystick drag event hoặc Arrow key event →
  `Twist { linear.x, angular.z }`
- **Output thành công**: Robot di chuyển, bản đồ hiển thị real-time
- **Output lỗi**: Toast notification lỗi kết nối hoặc lỗi lưu bản đồ

#### UseCase: `ManualMappingUseCase`

- **Nhiệm vụ**: Orchestrate luồng điều khiển thủ công + SLAM mapping.
- **Input**: `Twist` --- `{ linear.x: float, angular.z: float }`
- **Output**: `OccupancyGrid` (bản đồ real-time)
- **Gọi đến**:
  - `rosbridge.publish(/cmd_vel)` --- gửi lệnh vận tốc đến robot
  - `rosbridge.subscribe(/map)` --- nhận bản đồ cập nhật
  - `rosbridge.callService(/slam_toolbox/serialize_map)` --- lưu bản đồ

#### Firmware: `ESP32 Main`

- **Nhiệm vụ**: Nhận /cmd_vel, điều khiển động cơ qua TB6612FNG, đọc
  encoder và LiDAR, publish /odom + /scan.
- **Subscribe**: `/cmd_vel` (geometry_msgs/Twist)
- **Publish**:
  - `/scan` (sensor_msgs/LaserScan) --- dữ liệu LiDAR 360°
  - `/odom` (nav_msgs/Odometry) --- odometry từ wheel encoder
  - `/imu/data_raw` (sensor_msgs/Imu) --- dữ liệu IMU

#### Port: `SLAM Toolbox`

- **Nhiệm vụ**: Xử lý thuật toán SLAM, xây dựng bản đồ từ /scan + /odom.
- **Subscribe**: `/scan`, TF (odom → base_footprint)
- **Publish**: `/map` (nav_msgs/OccupancyGrid)
- **Service**: `/slam_toolbox/serialize_map` --- lưu bản đồ ra file

#### Lược đồ tuần tự nội bộ PM

![](media/image18.png)

#### Giao diện

##### Giao diện mẫu

![](media/image19.png)

##### Giao diện ứng dụng

![](media/image20.png)

## UC-02: Tạo lập bản đồ bằng di chuyển tự động

### Mô tả use case

  -------------------------------------------------------------
  Mục      Nội dung
  -------- ----------------------------------------------------
  Phụ      UC-01 (chia sẻ cơ sở hạ tầng SLAM Mapping)
  thuộc    

  Mục đích Người vận hành cần quét bản đồ toàn bộ không gian mà
           không phải điều khiển thủ công. PM cho phép robot tự
           động khám phá các vùng chưa biết (frontier
           exploration) để xây dựng bản đồ hoàn chỉnh mà không
           cần can thiệp liên tục.

  Mô tả    Người vận hành bật chế độ Auto Exploration, hệ thống
           sử dụng thuật toán frontier exploration (m-explore)
           để tự động điều hướng robot đến các biên giới chưa
           khám phá, kết hợp SLAM Toolbox xây dựng bản đồ cho
           đến khi toàn bộ không gian được quét.

  Actor    Người vận hành (Operator)
  chính    

  Actor    SLAM Toolbox (xử lý SLAM), explore_lite (frontier
  liên     exploration), Nav2 planner (lập đường đi), ESP32
  quan     firmware (điều khiển robot)

  Tiền     1\. Robot đã bật nguồn và kết nối WiFi\
  điều     2. Web dashboard đã kết nối rosbridge (status =
  kiện     connected)\
           3. Hệ thống đang ở chế độ SLAM Mapping\
           4. explore_lite node đã được launch (use_explore =
           true)

  Dãy lệnh 1\. Người vận hành mở web dashboard và xác nhận kết
  thực     nối ROS thành công\
  hiện     2. Người vận hành chọn chế độ "Mapping" trên Mode
  bình     Controller\
  thường   3. Người vận hành bật toggle "Auto Exploration"\
           4. Hệ thống publish /explore/resume = true →
           explore_lite bắt đầu tìm frontier\
           5. explore_lite xác định frontier gần nhất và gửi
           navigation goal\
           6. Robot tự động di chuyển đến frontier, SLAM
           Toolbox cập nhật bản đồ\
           7. Quá trình lặp lại cho đến khi không còn frontier
           (exploration complete)\
           8. Người vận hành nhấn "Save Map" để lưu bản đồ hoàn
           chỉnh

  Hậu điều Bản đồ 2D hoàn chỉnh (.yaml + .pgm) được lưu, phủ
  kiện     toàn bộ không gian có thể tiếp cận
  (thành   
  công)    

  Hậu điều Robot dừng tại vị trí hiện tại, bản đồ một phần vẫn
  kiện     còn trong bộ nhớ SLAM (có thể lưu phần đã quét hoặc
  (thất    chuyển sang điều khiển thủ công)
  bại)     

  Xử lý    Robot bị kẹt (progress_timeout) → explore_lite thử
  ngoại lệ frontier khác\
           Không còn frontier nhưng bản đồ chưa đầy đủ → Người
           vận hành điều khiển thủ công bổ sung\
           Mất kết nối → Robot dừng (safety timeout),
           exploration tạm dừng
  -------------------------------------------------------------

### Lược đồ tuần tự

![](media/image21.png)

### Lược đồ hoạt động

![](media/image22.png)

### Lược đồ trạng thái

![](media/image23.png)

### Lược đồ lớp ý niệm

![](media/image24.png)

### Phân rã thành phần PM

#### Controller: `DashboardWebApp`

- **Nhiệm vụ**: Nhận lệnh bật/tắt Auto Exploration từ người vận hành,
  publish tín hiệu resume/pause qua rosbridge.
- **Topic publish**: `/explore/resume` (std_msgs/Bool)
- **Topic subscribe**: `/explore/status`
  (explore_lite_msgs/ExploreStatus)
- **Input**: Toggle switch event → `Bool { data: true/false }`
- **Output thành công**: Hiển thị trạng thái exploration
  (exploring/paused/complete)
- **Output lỗi**: Toast notification lỗi kết nối

#### UseCase: `AutoExplorationUseCase`

- **Nhiệm vụ**: Orchestrate luồng frontier exploration tự động.
- **Input**: `Bool` --- `{ data: true }` (bật exploration)
- **Output**: `ExploreStatus` (trạng thái exploration real-time)
- **Gọi đến**:
  - `rosbridge.publish(/explore/resume)` --- bật/tắt exploration
  - `rosbridge.subscribe(/explore/status)` --- theo dõi trạng thái
  - `rosbridge.subscribe(/map)` --- nhận bản đồ cập nhật

#### Node: `explore_lite`

- **Nhiệm vụ**: Thuật toán frontier exploration --- phân tích bản đồ,
  xác định biên giới chưa khám phá, gửi navigation goal.
- **Subscribe**: `/map` (costmap), `/explore/resume` (điều khiển)
- **Publish**: `/explore/status` (ExploreStatus)
- **Action client**: `NavigateToPose` --- gửi goal đến Nav2 hoặc
  move_base
- **Parameters**:
  - `planner_frequency`: 0.33 Hz
  - `progress_timeout`: 45.0s
  - `min_frontier_size`: 0.35m

#### Port: `SLAM Toolbox`

- **Nhiệm vụ**: Xử lý thuật toán SLAM, xây dựng bản đồ từ /scan + /odom.
- **Subscribe**: `/scan`, TF (odom → base_footprint)
- **Publish**: `/map` (nav_msgs/OccupancyGrid)
- **Service**: `/slam_toolbox/serialize_map` --- lưu bản đồ ra file

#### Lược đồ tuần tự nội bộ PM

![](media/image25.png)

#### Giao diện

##### Giao diện mẫu

![](media/image26.png)

##### Giao diện ứng dụng

Chưa hiện thực. Sẽ bổ sung ảnh chụp màn hình khi hoàn thành.

## UC-03: Di chuyển đến một điểm bất kỳ trên bản đồ đã quét

### Mô tả use case

  -------------------------------------------------------------
  Mục      Nội dung
  -------- ----------------------------------------------------
  Phụ      UC-01 hoặc UC-02 (cần có bản đồ đã lưu trước đó)
  thuộc    

  Mục đích Người vận hành cần robot di chuyển đến một vị trí cụ
           thể trong không gian đã được quét. PM cho phép người
           vận hành click vào bản đồ để chọn điểm đích, hệ
           thống tự động lập đường đi và điều hướng robot đến
           đó an toàn.

  Mô tả    Người vận hành chuyển sang chế độ Navigation, load
           bản đồ đã lưu, đặt vị trí ban đầu (initial pose),
           sau đó click vào bản đồ để đặt điểm đích. Hệ thống
           sử dụng Nav2 stack để lập đường đi và điều hướng
           robot tránh vật cản.

  Actor    Người vận hành (Operator)
  chính    

  Actor    Nav2 Stack (planner + controller + BT navigator),
  liên     AMCL (định vị), Map Server (cung cấp bản đồ), ESP32
  quan     firmware (điều khiển robot)

  Tiền     1\. Robot đã bật nguồn và kết nối WiFi\
  điều     2. Web dashboard đã kết nối rosbridge (status =
  kiện     connected)\
           3. Có ít nhất một bản đồ đã lưu trong thư mục maps\
           4. Hệ thống đang ở chế độ Navigation (Nav2 stack
           active)

  Dãy lệnh 1\. Người vận hành chuyển sang chế độ "Navigation"
  thực     trên Mode Controller\
  hiện     2. Hệ thống gọi /map_manager/set_mode(NAVIGATION) →
  bình     activate Nav2 stack\
  thường   3. Người vận hành chọn bản đồ từ danh sách và nhấn
           Load\
           4. Hệ thống gọi /map_manager/load_map → Map Server
           load bản đồ\
           5. Người vận hành đặt Initial Pose (vị trí hiện tại
           của robot trên bản đồ)\
           6. AMCL bắt đầu định vị robot trên bản đồ\
           7. Người vận hành click vào điểm đích trên bản đồ\
           8. Hệ thống gửi NavigateToPose action goal đến Nav2\
           9. Nav2 lập đường đi (global planner) và điều hướng
           robot (local controller)\
           10. Robot di chuyển đến đích, tránh vật cản động\
           11. Nav2 trả kết quả thành công khi robot đến đích

  Hậu điều Robot đã đến vị trí đích trên bản đồ, sẵn sàng nhận
  kiện     goal mới
  (thành   
  công)    

  Hậu điều Robot dừng tại vị trí hiện tại, navigation bị cancel
  kiện     hoặc abort. Người vận hành có thể thử lại với điểm
  (thất    đích khác hoặc điều khiển thủ công.
  bại)     

  Xử lý    Đường đi bị chặn hoàn toàn → Nav2 trả lỗi, UI hiển
  ngoại lệ thị thông báo\
           Robot bị kẹt (recovery behavior) → Nav2 thử
           spin/backup recovery\
           Người vận hành cancel → Gửi cancel goal, robot dừng\
           Mất kết nối → Robot dừng (safety timeout)
  -------------------------------------------------------------

### Lược đồ tuần tự

![](media/image27.png)

### Lược đồ hoạt động

![](media/image28.png)

### Lược đồ trạng thái

![](media/image29.png)

### Lược đồ lớp ý niệm

![](media/image30.png)

### Phân rã thành phần PM

#### Controller: `DashboardWebApp`

- **Nhiệm vụ**: Nhận click trên bản đồ từ người vận hành, chuyển đổi tọa
  độ pixel sang tọa độ map, gửi navigation goal qua rosbridge.
- **Service call**: `/map_manager/set_mode`, `/map_manager/load_map`
- **Topic publish**: `/initialpose`
  (geometry_msgs/PoseWithCovarianceStamped)
- **Action client**: `/navigate_to_pose` (nav2_msgs/NavigateToPose)
- **Input**: Click event (clientX, clientY) →
  `PoseStamped { header.frame_id: "map", pose.position: {x, y} }`
- **Output thành công**: Hiển thị tiến trình navigation (distance, ETA),
  thông báo đến đích
- **Output lỗi**: Toast notification lỗi (no path, aborted, cancelled)

#### UseCase: `NavigateToGoalUseCase`

- **Nhiệm vụ**: Orchestrate luồng điều hướng đến điểm đích.
- **Input**: `PoseStamped` ---
  `{ frame_id: "map", position: {x, y, z}, orientation: {x, y, z, w} }`
- **Output**: `NavigateToPoseResult` + `NavigateToPoseFeedback`
  (real-time)
- **Gọi đến**:
  - `rosbridge.sendGoal(/navigate_to_pose)` --- gửi goal đến Nav2
  - `rosbridge.cancelGoal()` --- hủy navigation
  - `rosbridge.callService(/map_manager/set_mode)` --- chuyển mode
  - `rosbridge.callService(/map_manager/load_map)` --- load bản đồ

#### Node: `Nav2 Stack`

- **Nhiệm vụ**: Lập đường đi và điều hướng robot đến đích an toàn.
- **Thành phần**:
  - `map_server` --- cung cấp bản đồ static
  - `amcl` --- định vị robot trên bản đồ (Adaptive Monte Carlo
    Localization)
  - `planner_server` --- lập đường đi toàn cục (NavFn/Dijkstra)
  - `controller_server` --- điều khiển cục bộ (DWB)
  - `bt_navigator` --- Behavior Tree orchestrator
  - `behavior_server` --- recovery behaviors (spin, backup)
- **Action server**: `/navigate_to_pose` (nav2_msgs/NavigateToPose)
- **Publish**: `/cmd_vel` (geometry_msgs/Twist) → ESP32

#### Node: `MapManagerNode`

- **Nhiệm vụ**: Quản lý chuyển đổi mode và load bản đồ.
- **Service servers**:
  - `/map_manager/set_mode` --- chuyển giữa SLAM_MAPPING và NAVIGATION
  - `/map_manager/load_map` --- load bản đồ từ file
  - `/map_manager/list_maps` --- liệt kê bản đồ có sẵn
- **Lifecycle management**: Activate/deactivate Nav2 nodes

#### Lược đồ tuần tự nội bộ PM

![](media/image31.png)

#### Giao diện

##### Giao diện mẫu

![](media/image32.png)

##### Giao diện ứng dụng

Chưa hiện thực. Sẽ bổ sung ảnh chụp màn hình khi hoàn thành.

## UC-04: Theo dõi và bám đuổi người dựa trên nhận diện khuôn mặt

### Mô tả use case

  -----------------------------------------------------------------------
  Mục               Nội dung
  ----------------- -----------------------------------------------------
  Phụ thuộc         

  Mục đích          Người vận hành cần robot tự động bám theo một cá nhân
                    cụ thể trong môi trường (ví dụ: đi theo chủ nhân
                    quanh nhà, theo trợ lý trong kho). PM cho phép chọn
                    người mục tiêu từ danh sách đã đăng ký, hệ thống dùng
                    camera + LiDAR để nhận diện và điều khiển robot bám
                    đuổi an toàn.

  Mô tả             Người vận hành chuyển sang chế độ Tracking, chọn một
                    người đã đăng ký làm mục tiêu, bật toggle Face
                    Tracking. Hệ thống sử dụng YOLOv8 để phát hiện thân
                    người, InsightFace để khớp khuôn mặt với embedding đã
                    lưu, kết hợp leg-pair LiDAR để ước lượng khoảng cách,
                    sau đó điều khiển servo camera + bánh xe bằng PID để
                    giữ mục tiêu ở giữa khung hình và ở khoảng cách mong
                    muốn.

  Actor chính       Người vận hành (Operator)

  Actor liên quan   YOLOv8n (phát hiện thân người), InsightFace buffalo_l
                    (trích xuất embedding khuôn mặt), ESP32-CAM (luồng
                    hình MJPEG), ESP32 main board (điều khiển động cơ +
                    servo + LiDAR), SQLite face database (lưu embedding
                    đã đăng ký)

  Tiền điều kiện    1\. Robot đã bật nguồn và kết nối WiFi\
                    2. Web dashboard đã kết nối rosbridge (status =
                    connected)\
                    3. ESP32-CAM đang stream `/camera/image_raw` và
                    publish `/camera_info`\
                    4. ESP32 main board đang publish `/scan` (LiDAR) và
                    nhận `/cmd_vel`, `/servo_cmd`\
                    5. Có ít nhất một người đã được đăng ký thành công
                    (UC-05)\
                    6. Hệ thống đang ở chế độ Tracking, không bật Manual
                    Override

  Dãy lệnh thực     1\. Người vận hành chọn chế độ "Tracking" trên Mode
  hiện bình thường  Controller\
                    2. Dashboard tự động chuyển primary viewport sang
                    camera\
                    3. Người vận hành mở "Manage Persons", chọn một người
                    đã đăng ký và đặt làm mục tiêu\
                    4. Dashboard gọi service
                    `/enrollment/set_target(person_id)`\
                    5. `enrollment_node` cập nhật target trong DB,
                    `person_tracker_node` đọc lại `current_target_id`\
                    6. Người vận hành bật toggle "Face Tracking" →
                    `trackingEnabled = true`\
                    7. `person_tracker_node` nhận khung hình từ
                    `/camera/image_raw`, phát hiện thân người bằng
                    YOLOv8n, dò khuôn mặt bằng InsightFace\
                    8. Hệ thống khớp embedding khuôn mặt với DB, gán
                    `is_target = true` cho người trùng
                    `current_target_id`\
                    9. `person_tracker_node` tính khoảng cách (`range_m`)
                    từ leg-pair LiDAR khớp theo bearing và publish
                    `/tracked_persons` (TrackedPersonArray)\
                    10. `tracking_controller_node` nhận target, chạy PID
                    servo (giữ bearing ≈ 0), PID yaw (handoff khi servo
                    vượt ngưỡng), PID linear (giữ khoảng cách trong
                    \[target_distance_min, target_distance_max\])\
                    11. Hệ thống publish `/cmd_vel` đến ESP32 và
                    `/servo_cmd` đến servo `camera_pan_joint`, robot quay
                    đầu và di chuyển bám theo người\
                    12. `/tracking_controller/status` được publish 5 Hz
                    để hiển thị trạng thái (TRACKING/SEARCH\_\*), khoảng
                    cách hiện tại và cờ obstacle trên dashboard\
                    13. Khi muốn dừng, người vận hành tắt toggle "Face
                    Tracking" → robot dừng (`/cmd_vel = 0`), controller
                    về trạng thái IDLE

  Hậu điều kiện     Robot bám sát mục tiêu trong khoảng cách
  (thành công)      \[target_distance_min, target_distance_max\], servo +
                    bánh xe phối hợp giữ mục tiêu ở giữa khung hình;
                    trạng thái controller = TRACKING

  Hậu điều kiện     Robot dừng tại vị trí an toàn (`/cmd_vel = 0`),
  (thất bại)        controller chuyển về SEARCH\_\* hoặc IDLE; PID state
                    được reset; mục tiêu mất nhưng `current_target_id`
                    vẫn được giữ để sẵn sàng theo dõi lại khi người mục
                    tiêu xuất hiện trong khung hình.

  Xử lý ngoại lệ    Mục tiêu rời khung hình ngắn (\< 0.5s) →
                    SEARCH_CONTINUE: robot tiếp tục quay theo hướng cũ\
                    Mục tiêu mất lâu hơn → SEARCH_SCAN: servo quét
                    trái-phải; nếu vẫn không thấy → SEARCH_ROTATE: robot
                    xoay tại chỗ\
                    Vật cản trước robot trong front safety arc → cấm tiến
                    (`linear.x = 0`), vẫn cho xoay\
                    `/camera_info` chưa nhận được → bỏ frame, log cảnh
                    báo throttle\
                    TF lookup thất bại (camera → laser_link) → bỏ frame,
                    không cập nhật bearing\
                    Không tìm được leg-pair khớp bearing →
                    `range_m = NaN`, controller bỏ qua linear command,
                    chỉ chạy servo/yaw\
                    Mất kết nối rosbridge → robot dừng (safety timeout
                    firmware)
  -----------------------------------------------------------------------

### Lược đồ tuần tự

![](media/image33.png)

### Lược đồ hoạt động

![](media/image34.png)

### Lược đồ trạng thái

![](media/image35.png)

### Lược đồ lớp ý niệm

![](media/image36.png)

### Phân rã thành phần PM

#### Controller: `DashboardWebApp`

- **Nhiệm vụ**: Cho phép người vận hành chọn mục tiêu, bật/tắt tracking,
  hiển thị trạng thái controller real-time và tinh chỉnh PID gain.
- **Service call**: `/enrollment/set_target`
  (slam_car_interfaces/SetTrackingTarget), `/enrollment/list_persons`
  (slam_car_interfaces/ListPersons),
  `/tracking_controller_node/set_parameters`
  (rcl_interfaces/SetParameters)
- **Topic publish**: `/cmd_vel` (chỉ khi Manual Override hoặc khi tắt
  tracking để reset về 0)
- **Topic subscribe**: `/tracked_persons`
  (slam_car_interfaces/TrackedPersonArray),
  `/tracking_controller/status` (std_msgs/String JSON)
- **Input**: Click "Set as target" trên thẻ người →
  `SetTrackingTargetRequest { person_id }`; Toggle Face Tracking → cập
  nhật state UI
- **Output thành công**: Hiển thị tên mục tiêu, badge trạng thái
  (TRACKING/SEARCH\_\*), range_m, cảnh báo obstacle
- **Output lỗi**: Toast notification khi `/enrollment/set_target` thất
  bại hoặc parse JSON status thất bại

#### UseCase: `PersonTrackingUseCase`

- **Nhiệm vụ**: Orchestrate luồng nhận diện + bám đuổi người mục tiêu.
- **Input**: `person_id: string` (mục tiêu), `enabled: bool` (bật/tắt
  tracking)
- **Output**: `TrackedPersonArray` (real-time),
  `TrackingControllerStatus` (5 Hz)
- **Gọi đến**:
  - `rosbridge.callService(/enrollment/set_target)` --- đặt mục tiêu
  - `rosbridge.subscribe(/tracked_persons)` --- overlay bbox trên camera
    viewport
  - `rosbridge.subscribe(/tracking_controller/status)` --- hiển thị
    state + range
  - `rosbridge.callService(/tracking_controller_node/set_parameters)`
    --- chỉnh 9 gain PID (servo/yaw/linear × kp/ki/kd)

#### Node: `person_tracker_node`

- **Nhiệm vụ**: Phát hiện thân người, nhận diện khuôn mặt, fuse với
  LiDAR leg-pair để gán range, publish kết quả tracking.
- **Subscribe**:
  - `/camera/image_raw` (sensor_msgs/Image)
  - `/camera_info` (sensor_msgs/CameraInfo)
  - `/scan` (sensor_msgs/LaserScan)
- **Publish**: `/tracked_persons`
  (slam_car_interfaces/TrackedPersonArray)
- **Phụ thuộc DB**: `~/.slam_car/face_db.sqlite` --- hot-reload
  embeddings khi DB thay đổi (so sánh `db_last_modified`)
- **Tham số chính**: `embedding_threshold`, `leg_cluster_min_width`,
  `leg_cluster_max_width`, `leg_pair_min_gap`, `leg_pair_max_gap`,
  `bearing_match_tolerance`

#### Node: `tracking_controller_node`

- **Nhiệm vụ**: Điều phối servo camera + bánh xe để bám mục tiêu, xử lý
  các trạng thái tìm kiếm khi mất mục tiêu, đảm bảo an toàn trước vật
  cản.
- **Subscribe**:
  - `/tracked_persons` (slam_car_interfaces/TrackedPersonArray)
  - `/scan` (sensor_msgs/LaserScan) --- front safety arc check
- **Publish**:
  - `/cmd_vel` (geometry_msgs/Twist) → ESP32 main board
  - `/servo_cmd` (sensor_msgs/JointState, name = `camera_pan_joint`)
  - `/tracking_controller/status` (std_msgs/String chứa JSON
    `{state, target_id, range_m, obstacle}`)
- **Vòng lặp**:
  - Servo loop 50 Hz --- PID servo bám bearing
  - Wheel loop 10 Hz --- PID yaw (handoff khi \|servo_angle\| \>
    servo_handoff_threshold)
    - PID linear (giữ khoảng cách)
  - Lost-target check 10 Hz --- chuyển trạng thái
    IDLE/TRACKING/SEARCH\_\*
  - Status loop 5 Hz --- publish JSON status
- **Tham số tunable runtime**: 9 PID gain (`pid_servo_kp/ki/kd`,
  `pid_wheel_yaw_kp/ki/kd`, `pid_linear_kp/ki/kd`)

#### Node: `enrollment_node` *(chỉ phần liên quan UC-04)*

- **Nhiệm vụ**: Quản lý mục tiêu hiện tại trong DB.
- **Service liên quan UC này**:
  - `/enrollment/set_target` (SetTrackingTarget) --- cập nhật
    `current_target_id`
  - `/enrollment/get_target` (GetTrackingTarget) --- đọc target hiện tại
  - `/enrollment/list_persons` (ListPersons) --- liệt kê danh sách
    enrolled

#### Firmware: `ESP32 Main`

- **Nhiệm vụ**: Nhận `/cmd_vel` điều khiển động cơ qua TB6612FNG, nhận
  `/servo_cmd` điều khiển servo `camera_pan_joint`, publish `/scan` từ
  LDS02RR.
- **Subscribe**: `/cmd_vel`, `/servo_cmd`
- **Publish**: `/scan`, `/odom`

#### Firmware: `ESP32 CAM`

- **Nhiệm vụ**: Stream MJPEG, được `cam_bridge_node` chuyển sang
  `/camera/image_raw`.
- **Publish (qua bridge)**: `/camera/image_raw`, `/camera_info`

#### Lược đồ tuần tự nội bộ PM

![](media/image37.png)

#### Giao diện

##### Giao diện mẫu

![](media/image38.png)

##### Giao diện ứng dụng

![](media/image39.png)
