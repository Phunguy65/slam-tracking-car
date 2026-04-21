"""
Tracking controller node: controls servo pan and wheel movement to follow target.

- Subscribes to /tracked_persons (TrackedPersonArray)
- Controls servo pan for fast, fine-grained tracking (50Hz PID)
- Controls wheel yaw for large movements (10Hz PID)
- Implements servo-wheel coordination (handoff at ±30°)
- Implements search behavior when target is lost
- Publishes /cmd_vel (Twist) for wheels
- Publishes /servo_cmd (JointState) for servo

Search behavior state machine:
1. TRACKING: Normal tracking
2. SEARCH_CONTINUE: Continue last direction for 0.5s
3. SEARCH_SCAN: Servo scans left-right for 2s
4. SEARCH_ROTATE: Robot rotates 360° over 5s
5. IDLE: Wait for target to reappear
"""

import math

import rclpy
from geometry_msgs.msg import Twist
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from rclpy.parameter import Parameter
from sensor_msgs.msg import JointState
from std_msgs.msg import Header

from slam_car_interfaces.msg import TrackedPersonArray


class TrackingState:
    """Tracking and search state machine states."""

    TRACKING = 0
    SEARCH_CONTINUE = 1
    SEARCH_SCAN = 2
    SEARCH_ROTATE = 3
    IDLE = 4


class TrackingControllerNode(Node):
    """ROS2 node for coordinated servo + wheel tracking control."""

    # PID parameter names for validation
    PID_PARAMS = frozenset(
        [
            "pid_servo_kp",
            "pid_servo_ki",
            "pid_servo_kd",
            "pid_wheel_yaw_kp",
            "pid_wheel_yaw_ki",
            "pid_wheel_yaw_kd",
            "pid_linear_kp",
            "pid_linear_ki",
            "pid_linear_kd",
        ]
    )

    def __init__(self):
        super().__init__("tracking_controller_node")

        # ─── Parameters ──────────────────────────────────────────────────────
        # Servo PID (fast, fine adjustment)
        self.declare_parameter("pid_servo_kp", 2.0)
        self.declare_parameter("pid_servo_ki", 0.0)
        self.declare_parameter("pid_servo_kd", 0.1)

        # Wheel yaw PID (slow, coarse adjustment)
        self.declare_parameter("pid_wheel_yaw_kp", 0.5)
        self.declare_parameter("pid_wheel_yaw_ki", 0.0)
        self.declare_parameter("pid_wheel_yaw_kd", 0.05)

        # Linear PID (forward/backward control)
        self.declare_parameter("pid_linear_kp", 0.3)
        self.declare_parameter("pid_linear_ki", 0.0)
        self.declare_parameter("pid_linear_kd", 0.05)

        # Control limits
        self.declare_parameter("max_servo_angle", 1.57)  # ±90° in radians
        self.declare_parameter("servo_handoff_threshold", 0.52)  # ±30° in radians
        self.declare_parameter("max_linear_speed", 0.3)
        self.declare_parameter("max_angular_speed", 1.0)

        # Target distance control (based on body bbox width)
        self.declare_parameter("target_body_width_min", 0.20)  # Move forward if smaller
        self.declare_parameter("target_body_width_max", 0.30)  # Move backward if larger
        self.declare_parameter("body_width_too_far", 0.15)  # Definitely too far
        self.declare_parameter("body_width_too_close", 0.35)  # Definitely too close

        # Search behavior timing
        self.declare_parameter("search_continue_duration", 0.5)
        self.declare_parameter("search_scan_duration", 2.0)
        self.declare_parameter("search_rotate_duration", 5.0)

        # Target lost timeout
        self.declare_parameter("lost_timeout", 0.5)

        # ─── Load parameters ─────────────────────────────────────────────────
        self.servo_kp = self.get_parameter("pid_servo_kp").value
        self.servo_ki = self.get_parameter("pid_servo_ki").value
        self.servo_kd = self.get_parameter("pid_servo_kd").value

        self.wheel_yaw_kp = self.get_parameter("pid_wheel_yaw_kp").value
        self.wheel_yaw_ki = self.get_parameter("pid_wheel_yaw_ki").value
        self.wheel_yaw_kd = self.get_parameter("pid_wheel_yaw_kd").value

        self.linear_kp = self.get_parameter("pid_linear_kp").value
        self.linear_ki = self.get_parameter("pid_linear_ki").value
        self.linear_kd = self.get_parameter("pid_linear_kd").value

        self.max_servo_angle = self.get_parameter("max_servo_angle").value
        self.servo_handoff_threshold = self.get_parameter(
            "servo_handoff_threshold"
        ).value
        self.max_linear_speed = self.get_parameter("max_linear_speed").value
        self.max_angular_speed = self.get_parameter("max_angular_speed").value

        self.target_width_min = self.get_parameter("target_body_width_min").value
        self.target_width_max = self.get_parameter("target_body_width_max").value
        self.width_too_far = self.get_parameter("body_width_too_far").value
        self.width_too_close = self.get_parameter("body_width_too_close").value

        self.search_continue_duration = self.get_parameter(
            "search_continue_duration"
        ).value
        self.search_scan_duration = self.get_parameter("search_scan_duration").value
        self.search_rotate_duration = self.get_parameter("search_rotate_duration").value
        self.lost_timeout = self.get_parameter("lost_timeout").value

        # ─── State ───────────────────────────────────────────────────────────
        self.current_servo_angle = 0.0  # radians, 0 = center
        self.tracking_state = TrackingState.IDLE
        self.last_target_time = 0.0
        self.state_start_time = 0.0
        self.last_movement_direction = 0.0  # Last angular.z direction

        # PID state - servo
        self.servo_integral = 0.0
        self.servo_prev_error = 0.0

        # PID state - wheel yaw
        self.wheel_yaw_integral = 0.0
        self.wheel_yaw_prev_error = 0.0

        # PID state - linear
        self.linear_integral = 0.0
        self.linear_prev_error = 0.0

        # Search scan state
        self.scan_direction = 1  # 1 = left, -1 = right
        self.scan_angle = 0.0

        # Register parameter callback for live tuning
        self.add_on_set_parameters_callback(self._on_parameter_change)

        # ─── ROS interfaces ──────────────────────────────────────────────────
        self.tracked_sub = self.create_subscription(
            TrackedPersonArray, "/tracked_persons", self._tracked_callback, 10
        )
        self.cmd_vel_pub = self.create_publisher(Twist, "/cmd_vel", 10)
        self.servo_cmd_pub = self.create_publisher(JointState, "/servo_cmd", 10)

        # Timers for control loops
        # Servo control at 50Hz
        self.create_timer(1.0 / 50.0, self._servo_control_loop)
        # Wheel control at 10Hz
        self.create_timer(1.0 / 10.0, self._wheel_control_loop)

        self.get_logger().info(
            "Tracking controller started (servo + wheel coordination)"
        )

    def _on_parameter_change(self, params: list[Parameter]) -> SetParametersResult:
        """Handle dynamic parameter updates for live PID tuning."""
        for param in params:
            if param.name in self.PID_PARAMS:
                if param.value < 0.0:
                    return SetParametersResult(
                        successful=False,
                        reason=f"PID gains must be non-negative: {param.name}={param.value}",
                    )

        for param in params:
            name = param.name
            val = param.value
            if name == "pid_servo_kp":
                self.servo_kp = val
            elif name == "pid_servo_ki":
                self.servo_ki = val
            elif name == "pid_servo_kd":
                self.servo_kd = val
            elif name == "pid_wheel_yaw_kp":
                self.wheel_yaw_kp = val
            elif name == "pid_wheel_yaw_ki":
                self.wheel_yaw_ki = val
            elif name == "pid_wheel_yaw_kd":
                self.wheel_yaw_kd = val
            elif name == "pid_linear_kp":
                self.linear_kp = val
            elif name == "pid_linear_ki":
                self.linear_ki = val
            elif name == "pid_linear_kd":
                self.linear_kd = val
            else:
                continue
            self.get_logger().info(f"Updated {name} = {val}")

        return SetParametersResult(successful=True)

    def _tracked_callback(self, msg: TrackedPersonArray):
        """Process tracked persons and update state."""
        current_time = self.get_clock().now().nanoseconds / 1e9

        # Find target person
        target = None
        for person in msg.persons:
            if person.is_target:
                target = person
                break

        if target is not None:
            self.last_target_time = current_time
            self._update_tracking(target, current_time)
        else:
            # No target in frame
            time_since_target = current_time - self.last_target_time
            if time_since_target > self.lost_timeout:
                self._handle_target_lost(current_time)

    def _update_tracking(self, target, current_time: float):
        """Update tracking state with target position."""
        # If we were in search mode, return to tracking
        if self.tracking_state != TrackingState.TRACKING:
            self.tracking_state = TrackingState.TRACKING
            self.get_logger().info("Target found, resuming tracking")

        # Calculate horizontal error (normalized 0-1, 0.5 = center)
        error_x = 0.5 - target.body_bbox.center_x  # Positive = target is left

        # Convert to angle error in radians (approximate FOV mapping)
        # Assuming ~60° horizontal FOV, error of 0.5 = ~30°
        angle_error = error_x * math.pi / 3.0  # Map -0.5..0.5 to -π/6..π/6

        # Update servo angle target (relative to current servo position)
        # The error tells us how far off-center the target is in the image
        # We need to move servo to center it

        # Servo PID (fast response)
        self.servo_integral += angle_error
        servo_derivative = angle_error - self.servo_prev_error
        servo_delta = (
            self.servo_kp * angle_error
            + self.servo_ki * self.servo_integral
            + self.servo_kd * servo_derivative
        )
        self.servo_prev_error = angle_error

        # Update servo angle
        self.current_servo_angle += servo_delta * (1.0 / 50.0)  # Scale by dt
        self.current_servo_angle = max(
            -self.max_servo_angle, min(self.max_servo_angle, self.current_servo_angle)
        )

        # Store body width for linear control
        self._last_body_width = target.body_bbox.width

        # Store last movement direction for search behavior
        self.last_movement_direction = 1.0 if error_x > 0 else -1.0

    def _handle_target_lost(self, current_time: float):
        """Handle target lost - transition through search states."""
        if self.tracking_state == TrackingState.TRACKING:
            # Just lost target - start search
            self.tracking_state = TrackingState.SEARCH_CONTINUE
            self.state_start_time = current_time
            self.get_logger().info("Target lost, entering SEARCH_CONTINUE")

        elif self.tracking_state == TrackingState.SEARCH_CONTINUE:
            if current_time - self.state_start_time > self.search_continue_duration:
                self.tracking_state = TrackingState.SEARCH_SCAN
                self.state_start_time = current_time
                self.scan_direction = int(self.last_movement_direction) or 1
                self.get_logger().info("Entering SEARCH_SCAN")

        elif self.tracking_state == TrackingState.SEARCH_SCAN:
            if current_time - self.state_start_time > self.search_scan_duration:
                self.tracking_state = TrackingState.SEARCH_ROTATE
                self.state_start_time = current_time
                self.get_logger().info("Entering SEARCH_ROTATE")

        elif self.tracking_state == TrackingState.SEARCH_ROTATE:
            if current_time - self.state_start_time > self.search_rotate_duration:
                self.tracking_state = TrackingState.IDLE
                self.state_start_time = current_time
                self.get_logger().info("Entering IDLE")

    def _servo_control_loop(self):
        """50Hz servo control loop."""
        if self.tracking_state == TrackingState.SEARCH_SCAN:
            # Servo scan behavior
            scan_speed = math.pi / self.search_scan_duration  # Full range in duration
            self.scan_angle += self.scan_direction * scan_speed * (1.0 / 50.0)

            # Reverse direction at limits
            if abs(self.scan_angle) > self.max_servo_angle:
                self.scan_direction *= -1
                self.scan_angle = max(
                    -self.max_servo_angle, min(self.max_servo_angle, self.scan_angle)
                )

            self.current_servo_angle = self.scan_angle

        # Publish servo command
        servo_msg = JointState()
        servo_msg.header = Header()
        servo_msg.header.stamp = self.get_clock().now().to_msg()
        servo_msg.name = ["camera_pan_joint"]
        servo_msg.position = [self.current_servo_angle]

        self.servo_cmd_pub.publish(servo_msg)

    def _wheel_control_loop(self):
        """10Hz wheel control loop."""
        cmd = Twist()
        current_time = self.get_clock().now().nanoseconds / 1e9

        if self.tracking_state == TrackingState.TRACKING:
            # ─── Yaw control (servo-wheel coordination) ──────────────────────
            # If servo is beyond handoff threshold, rotate wheels to recenter
            if abs(self.current_servo_angle) > self.servo_handoff_threshold:
                # Wheel yaw PID to bring servo back to center
                yaw_error = self.current_servo_angle  # Positive = servo turned left

                self.wheel_yaw_integral += yaw_error
                yaw_derivative = yaw_error - self.wheel_yaw_prev_error
                angular_z = (
                    self.wheel_yaw_kp * yaw_error
                    + self.wheel_yaw_ki * self.wheel_yaw_integral
                    + self.wheel_yaw_kd * yaw_derivative
                )
                self.wheel_yaw_prev_error = yaw_error

                # Clamp angular velocity
                cmd.angular.z = max(
                    -self.max_angular_speed, min(self.max_angular_speed, angular_z)
                )

                # Simultaneously move servo back toward center
                center_rate = 0.5  # radians per second
                if self.current_servo_angle > 0:
                    self.current_servo_angle -= center_rate * (1.0 / 10.0)
                else:
                    self.current_servo_angle += center_rate * (1.0 / 10.0)

            else:
                # Servo handles tracking, wheels don't rotate
                self.wheel_yaw_integral = 0.0
                self.wheel_yaw_prev_error = 0.0

            # ─── Linear control (forward/backward based on body size) ────────
            body_width = getattr(self, "_last_body_width", 0.25)

            if body_width < self.width_too_far:
                # Too far - move forward
                linear_error = self.target_width_min - body_width
            elif body_width > self.width_too_close:
                # Too close - move backward
                linear_error = self.target_width_max - body_width
            elif body_width < self.target_width_min:
                # Slightly too far
                linear_error = self.target_width_min - body_width
            elif body_width > self.target_width_max:
                # Slightly too close
                linear_error = self.target_width_max - body_width
            else:
                # In optimal range
                linear_error = 0.0

            self.linear_integral += linear_error
            linear_derivative = linear_error - self.linear_prev_error
            linear_x = (
                self.linear_kp * linear_error
                + self.linear_ki * self.linear_integral
                + self.linear_kd * linear_derivative
            )
            self.linear_prev_error = linear_error

            cmd.linear.x = max(
                -self.max_linear_speed, min(self.max_linear_speed, linear_x)
            )

        elif self.tracking_state == TrackingState.SEARCH_CONTINUE:
            # Continue last movement direction briefly
            cmd.angular.z = self.last_movement_direction * 0.3

        elif self.tracking_state == TrackingState.SEARCH_SCAN:
            # Servo scans, wheels stay still (handled in servo loop)
            pass

        elif self.tracking_state == TrackingState.SEARCH_ROTATE:
            # Rotate robot 360° slowly
            # 2π radians in search_rotate_duration seconds
            angular_speed = (2 * math.pi) / self.search_rotate_duration
            cmd.angular.z = angular_speed

        elif self.tracking_state == TrackingState.IDLE:
            # Stop all movement
            # Reset PID integrals
            self.servo_integral = 0.0
            self.wheel_yaw_integral = 0.0
            self.linear_integral = 0.0

        self.cmd_vel_pub.publish(cmd)


def main(args=None):
    rclpy.init(args=args)
    node = TrackingControllerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
