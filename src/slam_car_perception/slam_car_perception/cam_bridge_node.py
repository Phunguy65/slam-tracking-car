"""
Camera bridge node: ESP32-CAM HTTP MJPEG stream → ROS2 /camera/image_raw.

Fetches MJPEG frames from ESP32-CAM HTTP endpoint and republishes
as sensor_msgs/Image on ROS2 topic.

Uses a ROS2 timer instead of a background thread to avoid concurrency
issues with rclpy spin.
"""
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2
import numpy as np


class CamBridgeNode(Node):
    def __init__(self):
        super().__init__("cam_bridge_node")

        # Parameters
        self.declare_parameter("cam_url", "http://192.168.1.100:80/stream")
        self.declare_parameter("frame_id", "camera_optical_frame")
        self.declare_parameter("fps", 10)

        self.cam_url = self.get_parameter("cam_url").value
        self.frame_id = self.get_parameter("frame_id").value
        self.fps = self.get_parameter("fps").value

        # Publisher
        self.publisher = self.create_publisher(Image, "/camera/image_raw", 10)
        self.bridge = CvBridge()

        # OpenCV VideoCapture for MJPEG stream (handles HTTP internally)
        self.cap = None
        self._connect()

        # Timer-driven frame capture (runs in rclpy spin thread — no concurrency issues)
        timer_period = 1.0 / self.fps
        self.timer = self.create_timer(timer_period, self._capture_frame)

        self.get_logger().info(f"Camera bridge started: {self.cam_url} @ {self.fps} FPS")

    def _connect(self):
        """Open or reopen the MJPEG stream via OpenCV."""
        if self.cap is not None:
            self.cap.release()
        self.cap = cv2.VideoCapture(self.cam_url)
        if self.cap.isOpened():
            self.get_logger().info("Stream connected")
        else:
            self.get_logger().warn(f"Failed to open stream: {self.cam_url}")

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

        msg = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = self.frame_id
        self.publisher.publish(msg)

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
