"""
Face follow controller: subscribe /face_detections, publish /cmd_vel.

Control layer node — receives face detection data from perception
and applies PID control to generate velocity commands.

Separated from perception to maintain clean layer boundaries
and allow command arbitration with Nav2/teleop.

Supports live PID parameter tuning via set_parameters service.
"""
import rclpy
from rclpy.node import Node
from rclpy.parameter import Parameter
from rcl_interfaces.msg import SetParametersResult
from geometry_msgs.msg import PoseArray, Twist
import time


class FaceFollowController(Node):
    # PID parameter names for validation
    PID_PARAMS = frozenset([
        "pid_yaw_kp", "pid_yaw_ki", "pid_yaw_kd",
        "pid_linear_kp", "pid_linear_ki", "pid_linear_kd",
    ])

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

        # Register parameter callback for live PID tuning
        self.add_on_set_parameters_callback(self._on_parameter_change)

        # ROS interfaces
        self.sub = self.create_subscription(
            PoseArray, "/face_detections", self._detection_callback, 10
        )
        self.cmd_pub = self.create_publisher(Twist, "/cmd_vel", 10)

        self.get_logger().info("Face follow controller started (live PID tuning enabled)")

    def _on_parameter_change(self, params: list[Parameter]) -> SetParametersResult:
        """
        Handle dynamic parameter updates for live PID tuning.
        
        Validates that PID gains are non-negative before applying.
        """
        # Validate all parameters first (atomic check)
        for param in params:
            if param.name in self.PID_PARAMS:
                if param.value < 0.0:
                    return SetParametersResult(
                        successful=False,
                        reason=f"PID gains must be non-negative: {param.name}={param.value}",
                    )

        # Apply all parameters (they passed validation)
        for param in params:
            if param.name == "pid_yaw_kp":
                self.yaw_kp = param.value
                self.get_logger().info(f"Updated pid_yaw_kp = {param.value}")
            elif param.name == "pid_yaw_ki":
                self.yaw_ki = param.value
                self.get_logger().info(f"Updated pid_yaw_ki = {param.value}")
            elif param.name == "pid_yaw_kd":
                self.yaw_kd = param.value
                self.get_logger().info(f"Updated pid_yaw_kd = {param.value}")
            elif param.name == "pid_linear_kp":
                self.lin_kp = param.value
                self.get_logger().info(f"Updated pid_linear_kp = {param.value}")
            elif param.name == "pid_linear_ki":
                self.lin_ki = param.value
                self.get_logger().info(f"Updated pid_linear_ki = {param.value}")
            elif param.name == "pid_linear_kd":
                self.lin_kd = param.value
                self.get_logger().info(f"Updated pid_linear_kd = {param.value}")
            elif param.name == "max_linear_speed":
                self.max_linear = param.value
                self.get_logger().info(f"Updated max_linear_speed = {param.value}")
            elif param.name == "max_angular_speed":
                self.max_angular = param.value
                self.get_logger().info(f"Updated max_angular_speed = {param.value}")
            elif param.name == "target_face_ratio":
                self.target_face_ratio = param.value
                self.get_logger().info(f"Updated target_face_ratio = {param.value}")
            elif param.name == "lost_timeout":
                self.lost_timeout = param.value
                self.get_logger().info(f"Updated lost_timeout = {param.value}")

        return SetParametersResult(successful=True)

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
