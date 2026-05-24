import math

import rclpy.time
import tf2_geometry_msgs
import tf2_ros
from geometry_msgs.msg import PointStamped


class BearingTransform:
    """Convert image pixel bearings into the laser frame using TF2."""

    def __init__(
        self, node, camera_frame="camera_optical_frame", laser_frame="laser_link"
    ):
        self.node = node
        self.camera_frame = camera_frame
        self.laser_frame = laser_frame
        self.tf_buffer = tf2_ros.Buffer()
        self.tf_listener = tf2_ros.TransformListener(self.tf_buffer, node)

    def pixel_to_laser_bearing(self, u: float, image_width: int, k, stamp) -> float:
        """Return 2D bearing in laser_link for an image column."""
        fx = float(k[0])
        cx = float(k[2]) if k[2] else image_width / 2.0
        theta_cam = math.atan((u - cx) / fx)

        point = PointStamped()
        point.header.frame_id = self.camera_frame
        point.header.stamp = stamp
        point.point.x = math.sin(theta_cam)
        point.point.y = 0.0
        point.point.z = math.cos(theta_cam)

        try:
            transform = self.tf_buffer.lookup_transform(
                self.laser_frame,
                self.camera_frame,
                stamp,
            )
        except Exception:
            transform = self.tf_buffer.lookup_transform(
                self.laser_frame,
                self.camera_frame,
                rclpy.time.Time(),
            )

        transformed = tf2_geometry_msgs.do_transform_point(point, transform)
        return math.atan2(transformed.point.y, transformed.point.x)
