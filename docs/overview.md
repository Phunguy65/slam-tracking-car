# Giới thiệu và Cơ sở Khoa học

## Giới thiệu đề tài

### Mục đích

Trong bối cảnh Cách mạng Công nghiệp 4.0, robot tự hành (Autonomous Mobile
Robot - AMR) ngày càng đóng vai trò quan trọng trong nhiều lĩnh vực như công
nghiệp, logistics, dịch vụ và y tế. Để một robot có thể hoạt động thông minh,
năng lực cốt lõi cần được đáp ứng là khả năng tự nhận thức không gian thông qua
định vị và lập bản đồ.

Hiện nay, các hệ thống robot tích hợp SLAM (Simultaneous Localization and
Mapping) thường yêu cầu năng lực xử lý lớn, kéo theo chi phí phần cứng cao như
máy tính công nghiệp hoặc các nền tảng nhúng mạnh. Vì vậy, việc nghiên cứu, ứng
dụng và tối ưu các thuật toán này trên nền tảng vi điều khiển nhúng giá rẻ, tiết
kiệm năng lượng như ESP32 là một hướng tiếp cận có tính thách thức nhưng mang lại
giá trị thực tiễn cao.

Đề tài xây dựng mô hình robot tự hành tích hợp công nghệ SLAM nhằm giải quyết
bài toán định vị, lập bản đồ và điều hướng trên một nền tảng phần cứng nhỏ gọn.
ESP32-CAM được sử dụng để stream video giám sát theo thời gian thực. Đề tài
không chỉ có khả năng ứng dụng trong robot giám sát, robot phục vụ thông minh mà
còn giúp nhóm vận dụng tổng hợp kiến thức về lập trình nhúng, xử lý tín hiệu
cảm biến và điều khiển tự động trên thiết bị biên.

#### Mục tiêu

Đề tài hướng đến việc thiết kế, chế tạo và lập trình hoàn chỉnh một mô hình
robot tự hành thu nhỏ, hoạt động ổn định với chế độ cốt lõi SLAM và khả năng
stream video giám sát. Các mục tiêu chính gồm:

**Mục tiêu 1 — Thiết kế phần cứng và cơ điện tử:** Thiết kế, lắp ráp khung xe 4
bánh sử dụng động cơ DC tích hợp encoder, được điều khiển bởi vi điều khiển
trung tâm ESP32. Xây dựng hệ thống quản lý năng lượng ổn định bằng mạch hạ áp
(buck converter) để cấp nguồn độc lập cho các thành phần dễ gây nhiễu như servo,
động cơ và mạch xử lý.

**Mục tiêu 2 — Xây dựng chế độ SLAM:** Tích hợp cảm biến Lidar LDS02RR quét 360
độ và dữ liệu odometry từ encoder. Xây dựng thuật toán giúp robot tự động quét,
lập bản đồ 2D môi trường xung quanh và di chuyển đến tọa độ đích trong khi hạn
chế va chạm với vật cản.

**Mục tiêu 3 — Stream video giám sát:** Sử dụng module ESP32-CAM đặt trên cơ cấu
pan-tilt gồm hai servo SG90 để thu thập và truyền phát video theo thời gian thực,
phục vụ mục đích giám sát từ xa thông qua giao diện web.

**Mục tiêu 4 — Tích hợp và kiểm chứng hệ thống:** Đảm bảo robot có thể chuyển đổi
linh hoạt giữa các chế độ, xử lý dữ liệu theo thời gian thực và đánh giá độ
chính xác thông qua thực nghiệm trên mô hình thực tế.

#### Phương pháp tiến hành

##### Tìm hiểu hiện trạng

Khảo sát sự phát triển của robot tự hành trong các lĩnh vực công nghiệp,
logistics, dịch vụ và y tế; đồng thời phân tích nhu cầu tích hợp khả năng lập
bản đồ, điều hướng và tương tác với con người trên các nền tảng phần cứng nhỏ
gọn, chi phí thấp.

##### Tìm hiểu nghiệp vụ và phạm vi ứng dụng

Xác định phạm vi thực hiện của đề tài là mô hình prototype hoạt động trong môi
trường trong nhà, mặt sàn phẳng. Hệ thống Lidar được thiết kế để hoạt động trong
không gian có vách ngăn hoặc vật cản rõ ràng; đề tài chưa đặt mục tiêu vận hành
ngoài trời, trên địa hình gồ ghề hoặc trong điều kiện môi trường phức tạp.

Đối tượng nghiên cứu bao gồm động học xe 4 bánh dạng skid-steering/differential
drive, thuật toán dung hợp dữ liệu giữa Lidar và encoder, cùng thuật toán điều
khiển hồi tiếp PID cho cơ cấu pan-tilt và động cơ di chuyển.

##### Tìm hiểu mô hình, phương pháp và công nghệ

Nghiên cứu và áp dụng các hướng tiếp cận sau:

- **Thiết kế từ trên xuống (Top-down design)**: chia hệ thống thành các module
  phần cứng độc lập như khối nguồn, khối cảm biến, khối xử lý và khối chấp hành.
- **Lập trình và kiểm thử theo module**: kiểm thử riêng từng chức năng như đọc
  dữ liệu Lidar, đếm xung encoder, điều khiển PID động cơ và cấu hình camera
  trước khi tích hợp vào luồng điều khiển chung.
- **Thực nghiệm trên phần cứng thật**: chạy thử robot trong sa bàn hoặc phòng kín
  để đo sai số odometry, thời gian đáp ứng của pan-tilt và độ chính xác của bản
  đồ 2D.
- Các công nghệ và cơ sở khoa học liên quan được trình bày trong Mục II.

##### Phân tích, thiết kế, hiện thực, đánh giá

Từ kết quả khảo sát và nghiên cứu, tiến hành phân tích yêu cầu hệ thống, thiết
kế kiến trúc phần cứng và phần mềm, hiện thực từng module, tích hợp toàn hệ
thống và đánh giá kết quả qua thực nghiệm. Các tham số điều khiển, đặc biệt là
các hệ số Kp, Ki, Kd của bộ điều khiển PID, được tinh chỉnh dựa trên kết quả đo
lường thực tế nhằm tối ưu khả năng vận hành.

---

## Cơ sở Khoa học của Đề tài

### Tình hình nghiên cứu trong và ngoài nước

#### Tình hình nghiên cứu ngoài nước

Trên thế giới, nhiều tập đoàn công nghệ và logistics đã triển khai các giải pháp
robot tự hành trong giao hàng, giám sát và hỗ trợ con người. Một số ví dụ tiêu
biểu gồm Amazon Scout, robot giao hàng của Starship Technologies tại các khuôn
viên đại học ở Mỹ và châu Âu, hay FedEx Same Day Bot. Các hệ thống này cho thấy
xu hướng ứng dụng robot tự hành trong thực tế ngày càng phát triển mạnh.

Về mặt học thuật, nhiều công trình nghiên cứu đã được công bố liên quan đến
robot giao hàng tự động chặng cuối, robot di động tránh vật cản và các phương
pháp điều hướng dựa trên cảm biến. Điều này cho thấy các bài toán SLAM và điều
hướng tự động đang là những hướng nghiên cứu được quan tâm rộng rãi.

#### Tình hình nghiên cứu trong nước

Tại Việt Nam, nghiên cứu và ứng dụng robot tự hành vẫn đang trong giai đoạn phát
triển. Một số nhóm nghiên cứu tại các trường đại học kỹ thuật đã thực hiện các
đề tài về robot tự hành tránh vật cản, xe điều khiển từ xa qua IoT và robot phục
vụ trong môi trường trong nhà.

Tuy nhiên, các nghiên cứu tích hợp đồng thời khả năng tự hành, lập bản đồ và
điều khiển theo thời gian thực trên nền tảng phần cứng giá rẻ vẫn còn hạn chế.
Vì vậy, đề tài có tính thực tiễn, phù hợp với xu hướng phát triển robot thông
minh tại Việt Nam và có thể đóng vai trò nền tảng thử nghiệm cho các ứng dụng
robot trong gia đình, giám sát nội khu hoặc hỗ trợ con người.

---

### Công nghệ sử dụng

#### ESP32 — Vi điều khiển trung tâm

ESP32 được sử dụng làm bộ xử lý trung tâm của robot nhờ ưu điểm giá thành thấp,
tiêu thụ năng lượng thấp, hỗ trợ Wi-Fi/Bluetooth và có đủ ngoại vi để giao tiếp
với cảm biến, encoder, mạch điều khiển động cơ và các module mở rộng. Việc sử
dụng ESP32 giúp đề tài kiểm chứng khả năng triển khai các bài toán robot thông
minh trên nền tảng nhúng hạn chế tài nguyên.

#### ESP32-CAM — Stream video giám sát

ESP32-CAM được dùng để truyền phát video theo thời gian thực phục vụ giám sát từ
xa. Module này có kích thước nhỏ, chi phí thấp và phù hợp với các ứng dụng
streaming trên thiết bị biên.

#### Lidar LDS02RR — Cảm biến quét môi trường

Lidar LDS02RR là cảm biến quét 360 độ được dùng để thu thập khoảng cách đến các
vật cản xung quanh robot. Dữ liệu Lidar đóng vai trò quan trọng trong bài toán
SLAM 2D, giúp robot nhận biết cấu trúc môi trường, xây dựng bản đồ và hỗ trợ
tránh vật cản khi di chuyển.

#### Encoder — Đo lường chuyển động

Encoder gắn trên động cơ DC được dùng để đo số vòng quay của bánh xe, từ đó ước
lượng quãng đường và hướng di chuyển của robot. Dữ liệu encoder là thành phần
cốt lõi của odometry và được kết hợp với dữ liệu Lidar để cải thiện độ chính xác
trong quá trình định vị.

#### Động cơ DC và mạch điều khiển TB6612

Động cơ DC đảm nhiệm việc tạo chuyển động cho robot. Mạch điều khiển TB6612 được
dùng để điều khiển tốc độ và chiều quay của động cơ thông qua tín hiệu PWM từ
ESP32. Sự kết hợp này cho phép robot thực hiện các thao tác di chuyển tiến, lùi,
rẽ trái, rẽ phải và xoay tại chỗ.

#### Servo SG90 và cơ cấu pan-tilt

Hai servo SG90 được dùng để tạo cơ cấu pan-tilt cho camera, cho phép camera quay
theo hai trục ngang và dọc. Cơ cấu này giúp điều chỉnh góc nhìn camera từ xa
thông qua giao diện điều khiển.

#### SLAM 2D và dung hợp cảm biến

SLAM 2D là cơ sở thuật toán giúp robot vừa định vị vị trí của mình, vừa xây dựng
bản đồ môi trường xung quanh. Trong đề tài, dữ liệu từ Lidar và odometry được
dung hợp để nâng cao độ tin cậy của quá trình định vị. Bản đồ 2D thu được là cơ
sở để robot xác định vật cản và lập kế hoạch di chuyển đến vị trí mục tiêu.

#### Buck Converter — Quản lý nguồn

Mạch hạ áp buck converter được sử dụng để cung cấp các mức điện áp ổn định cho
từng khối trong hệ thống. Việc tách nguồn cho động cơ, servo và mạch xử lý giúp
giảm nhiễu, hạn chế sụt áp và tăng độ ổn định khi robot vận hành.

#### Phần mềm điều khiển và giao diện web

Hệ thống phần mềm được chia thành ba tầng chính: firmware nhúng, middleware ROS 2
và giao diện web điều khiển.

##### Firmware nhúng (PlatformIO + micro-ROS)

Firmware được phát triển trên nền tảng PlatformIO với framework Arduino, sử dụng
thư viện micro-ROS để tích hợp ESP32 vào hệ sinh thái ROS 2 Humble thông qua
giao thức WiFi UDP. ESP32 Main đóng vai trò micro-ROS node, publish các topic
`/scan` (LaserScan), `/odom` (Odometry), `/imu/data_raw` (Imu) và subscribe
`/cmd_vel` (Twist) để nhận lệnh điều khiển từ tầng trên. ESP32-CAM cung cấp
luồng MJPEG HTTP trên cổng 80, được bridge vào ROS thông qua node trung gian
trên máy tính.

Firmware được tổ chức theo kiến trúc module: mỗi ngoại vi (motor, encoder, lidar,
IMU, servo) có file source riêng biệt, giao tiếp qua interface chung trong
`ros_bridge`. Cơ chế safety watchdog tự động dừng động cơ khi mất kết nối với
micro-ROS agent, đảm bảo an toàn vận hành.

##### Middleware ROS 2

Tầng middleware chạy trên máy tính đồng hành (laptop hoặc SBC), bao gồm các node
ROS 2 Humble: micro-ROS agent (cầu nối UDP giữa ESP32 và ROS graph), SLAM
Toolbox (xây dựng bản đồ 2D từ dữ liệu `/scan` và TF odometry), Nav2 stack
(lập đường đi và điều hướng tự động) và rosbridge\_server (WebSocket gateway cho
giao diện web). Kiến trúc này cho phép tận dụng sức mạnh tính toán của máy tính
cho các thuật toán SLAM và navigation trong khi ESP32 chỉ đảm nhiệm thu thập dữ
liệu cảm biến và điều khiển cơ cấu chấp hành.

##### Giao diện web điều khiển (Next.js + roslibjs)

Giao diện điều khiển được xây dựng dưới dạng ứng dụng web single-page sử dụng
Next.js 16, React 19 và TypeScript. Giao tiếp với ROS 2 thông qua thư viện
roslibjs kết nối WebSocket đến rosbridge\_server. Quản lý trạng thái ứng dụng
bằng Zustand với các store chuyên biệt cho từng chức năng: kết nối ROS, chế độ
vận hành, bản đồ, điều hướng và khám phá tự động.

Giao diện cung cấp các thành phần tương tác chính:

- **Joystick ảo và điều khiển bàn phím**: publish lệnh `/cmd_vel` để điều khiển
  robot di chuyển thủ công trong chế độ Mapping.
- **Bản đồ occupancy grid thời gian thực**: render dữ liệu từ topic `/map` dưới
  dạng canvas 2D, hiển thị vị trí robot và đường đi đã lập.
- **Radar LiDAR**: trực quan hóa dữ liệu quét `/scan` dạng biểu đồ cực.
- **Stream camera**: hiển thị luồng MJPEG từ ESP32-CAM với điều khiển pan-tilt
  servo qua topic `/servo_cmd`.
- **Bảng điều khiển chế độ**: chuyển đổi giữa Mapping, Auto Exploration và
  Navigation; quản lý lưu/tải bản đồ.
- **Đặt điểm đích trên bản đồ**: click chọn tọa độ mục tiêu, gửi action
  `NavigateToPose` đến Nav2 và hiển thị tiến trình điều hướng.
- **Nút dừng khẩn cấp**: publish lệnh dừng tức thì đến robot.

Giao diện được thiết kế responsive, hỗ trợ thao tác trên cả máy tính và thiết bị
di động, cho phép người vận hành giám sát và điều khiển robot từ xa thông qua
trình duyệt web mà không cần cài đặt phần mềm chuyên dụng.
