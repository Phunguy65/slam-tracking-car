"""
Camera bridge node: ESP32-CAM HTTP MJPEG stream → ROS2 /camera/image_raw.

Fetches MJPEG frames from ESP32-CAM HTTP endpoint and republishes
as sensor_msgs/Image on ROS2 topic.

Uses a ROS2 timer instead of a background thread to avoid concurrency
issues with rclpy spin.
"""

import math

import cv2
import rclpy
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import CameraInfo, Image


class CamBridgeNode(Node):
    def __init__(self):
        super().__init__("cam_bridge_node")

        self.declare_parameter("cam_url", "http://192.168.1.248:80/stream")
        self.declare_parameter("frame_id", "camera_optical_frame")
        self.declare_parameter("fps", 10)
        self.declare_parameter("camera_fov_horizontal_deg", 62.0)
        self.declare_parameter("flip_image", False)

        self.cam_url = self.get_parameter("cam_url").value
        self.frame_id = self.get_parameter("frame_id").value
        self.fps = self.get_parameter("fps").value
        self.camera_fov_horizontal_deg = self.get_parameter(
            "camera_fov_horizontal_deg"
        ).value
        self.flip_image = self.get_parameter("flip_image").value
        self.camera_info = None

        self.publisher = self.create_publisher(Image, "/camera/image_raw", 10)
        self.camera_info_pub = self.create_publisher(CameraInfo, "/camera_info", 10)
        self.bridge = CvBridge()

        self.cap = None
        self._connect()

        timer_period = 1.0 / self.fps
        self.timer = self.create_timer(timer_period, self._capture_frame)

        self.get_logger().info(
            f"Camera bridge started: {self.cam_url} @ {self.fps} FPS"
        )

    def _connect(self):
        """Open or reopen the MJPEG stream via OpenCV."""
        if self.cap is not None:
            self.cap.release()
        self.cap = cv2.VideoCapture(self.cam_url)
        if self.cap.isOpened():
            self.get_logger().info("Stream connected")
        else:
            self.get_logger().warn(f"Failed to open stream: {self.cam_url}")

    def _camera_info_for_frame(self, width: int, height: int) -> CameraInfo:
        """Build cached camera intrinsics from configured horizontal FOV."""
        if self.camera_info is not None:
            return self.camera_info

        fov_rad = math.radians(self.camera_fov_horizontal_deg)
        fx = width / (2.0 * math.tan(fov_rad / 2.0))
        fy = fx
        cx = width / 2.0
        cy = height / 2.0

        camera_info = CameraInfo()
        camera_info.width = width
        camera_info.height = height
        camera_info.distortion_model = "plumb_bob"
        camera_info.d = [0.0, 0.0, 0.0, 0.0, 0.0]
        camera_info.k = [fx, 0.0, cx, 0.0, fy, cy, 0.0, 0.0, 1.0]
        camera_info.r = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
        camera_info.p = [fx, 0.0, cx, 0.0, 0.0, fy, cy, 0.0, 0.0, 0.0, 1.0, 0.0]
        self.camera_info = camera_info
        return camera_info

    def _capture_frame(self):
        """Grab one frame and publish it."""
        if self.cap is None or not self.cap.isOpened():
            self.get_logger().warn("Stream not connected, reconnecting...")
            self._connect()
            return

        ret, frame = self.cap.read()
        if not ret:
            self.get_logger().warn("Frame capture failed, reconnecting...")
            self._connect()
            return

        if self.flip_image:
            frame = cv2.flip(frame, -1)

        msg = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = self.frame_id
        self.publisher.publish(msg)

        height, width = frame.shape[:2]
        camera_info = self._camera_info_for_frame(width, height)
        camera_info.header.stamp = msg.header.stamp
        camera_info.header.frame_id = self.frame_id
        self.camera_info_pub.publish(camera_info)

    def destroy_node(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = CamBridgeNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
