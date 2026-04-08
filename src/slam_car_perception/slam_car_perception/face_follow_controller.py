"""
Face follow controller: subscribe /face_detections, publish /cmd_vel.

Control layer node — receives face detection data from perception
and applies PID control to generate velocity commands.

Separated from perception to maintain clean layer boundaries
and allow command arbitration with Nav2/teleop.
"""
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseArray, Twist
import time


class FaceFollowController(Node):
    def __init__(self):
        super().__init__("face_follow_controller")

        # Parameters
        self.declare_parameter("pid_yaw_kp", 0.3)
        self.declare_parameter("pid_yaw_ki", 0.0)
        self.declare_parameter("pid_yaw_kd", 0.05)
        self.declare_parameter("pid_linear_kp", 0.2)
        self.declare_parameter("pid_linear_ki", 0.0)
        self.declare_parameter("pid_linear_kd", 0.05)
        self.declare_parameter("max_linear_speed", 0.2)
        self.declare_parameter("max_angular_speed", 0.8)
        self.declare_parameter("target_face_ratio", 0.25)
        self.declare_parameter("lost_timeout", 2.0)

        # Load params
        self.max_linear = self.get_parameter("max_linear_speed").value
        self.max_angular = self.get_parameter("max_angular_speed").value
        self.target_face_ratio = self.get_parameter("target_face_ratio").value
        self.lost_timeout = self.get_parameter("lost_timeout").value

        # PID state
        self.yaw_kp = self.get_parameter("pid_yaw_kp").value
        self.yaw_ki = self.get_parameter("pid_yaw_ki").value
        self.yaw_kd = self.get_parameter("pid_yaw_kd").value
        self.lin_kp = self.get_parameter("pid_linear_kp").value
        self.lin_ki = self.get_parameter("pid_linear_ki").value
        self.lin_kd = self.get_parameter("pid_linear_kd").value

        self.yaw_integral = 0.0
        self.yaw_prev_error = 0.0
        self.lin_integral = 0.0
        self.lin_prev_error = 0.0
        self.last_face_time = 0.0

        # ROS interfaces
        self.sub = self.create_subscription(
            PoseArray, "/face_detections", self._detection_callback, 10
        )
        self.cmd_pub = self.create_publisher(Twist, "/cmd_vel", 10)

        self.get_logger().info("Face follow controller started")

    def _detection_callback(self, msg: PoseArray):
        cmd = Twist()

        if msg.poses:
            # Pick the largest face (highest position.z = normalized width)
            best = max(msg.poses, key=lambda p: p.position.z)
            self.last_face_time = time.time()

            # Yaw error: how far face center is from frame center
            yaw_error = 0.5 - best.position.x  # Positive = face is left

            # Linear error: face size vs target
            lin_error = self.target_face_ratio - best.position.z  # Positive = too far

            # PID for yaw
            self.yaw_integral += yaw_error
            yaw_derivative = yaw_error - self.yaw_prev_error
            angular_z = (
                self.yaw_kp * yaw_error
                + self.yaw_ki * self.yaw_integral
                + self.yaw_kd * yaw_derivative
            )
            self.yaw_prev_error = yaw_error

            # PID for linear
            self.lin_integral += lin_error
            lin_derivative = lin_error - self.lin_prev_error
            linear_x = (
                self.lin_kp * lin_error
                + self.lin_ki * self.lin_integral
                + self.lin_kd * lin_derivative
            )
            self.lin_prev_error = lin_error

            # Clamp
            cmd.angular.z = max(-self.max_angular, min(self.max_angular, angular_z))
            cmd.linear.x = max(-self.max_linear, min(self.max_linear, linear_x))

        else:
            # No face detected
            if time.time() - self.last_face_time > self.lost_timeout:
                self.yaw_integral = 0.0
                self.lin_integral = 0.0

        self.cmd_pub.publish(cmd)

    def destroy_node(self):
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = FaceFollowController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
