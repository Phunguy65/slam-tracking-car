"""Tracking controller node for coordinated servo, wheel, range, and safety control."""

import json
import math

import rclpy
from geometry_msgs.msg import Twist
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from rclpy.parameter import Parameter
from sensor_msgs.msg import JointState, LaserScan
from std_msgs.msg import Bool, Header, String

from slam_car_interfaces.msg import TrackedPersonArray


class PID:
    """Small PID helper with output clamp."""

    def __init__(self, kp=0.0, ki=0.0, kd=0.0, limit=None):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.limit = limit
        self.integral = 0.0
        self.previous_error = 0.0

    def step(self, error: float, dt: float) -> float:
        """Advance controller by one step."""
        self.integral += error * dt
        derivative = (error - self.previous_error) / dt if dt > 0 else 0.0
        self.previous_error = error
        output = self.kp * error + self.ki * self.integral + self.kd * derivative
        if self.limit is None:
            return output
        return max(-self.limit, min(self.limit, output))

    def reset(self):
        """Clear accumulated controller state."""
        self.integral = 0.0
        self.previous_error = 0.0


class TrackingState:
    """Controller states."""

    IDLE = "IDLE"
    TRACKING = "TRACKING"
    SEARCH_SCAN = "SEARCH_SCAN"


class TrackingControllerNode(Node):
    """ROS2 node for person-follow control."""

    PID_PARAMS = frozenset(
        {
            "pid_servo_kp",
            "pid_servo_ki",
            "pid_servo_kd",
            "pid_wheel_yaw_kp",
            "pid_wheel_yaw_ki",
            "pid_wheel_yaw_kd",
            "pid_linear_kp",
            "pid_linear_ki",
            "pid_linear_kd",
        }
    )

    def __init__(self):
        super().__init__("tracking_controller_node")
        self._declare_parameters()
        self._load_parameters()

        self.servo_pid = PID(self.servo_kp, self.servo_ki, self.servo_kd)
        self.yaw_pid = PID(
            self.wheel_yaw_kp,
            self.wheel_yaw_ki,
            self.wheel_yaw_kd,
            self.max_angular_speed,
        )
        self.linear_pid = PID(
            self.linear_kp,
            self.linear_ki,
            self.linear_kd,
            self.max_linear_speed,
        )

        self.current_servo_angle = 0.0
        self._last_published_servo_angle = float("nan")
        self.tracking_state = TrackingState.IDLE
        self.last_target_time = 0.0
        self.state_start_time = 0.0
        self.last_movement_direction = 1.0
        self.last_target_id = ""
        self.last_target_range = math.nan
        self.last_target_bearing = 0.0
        self.latest_scan = None
        self.obstacle = False
        self.scan_direction = 1.0
        self.scan_angle = 0.0
        self.target_confirm_count = 0
        self.enabled = False

        self.add_on_set_parameters_callback(self._on_parameter_change)

        self.create_subscription(
            TrackedPersonArray, "/tracked_persons", self._tracked_callback, 10
        )
        self.create_subscription(LaserScan, "/scan", self._scan_callback, 10)
        self.create_subscription(
            Bool, "/tracking_controller/enabled", self._enabled_callback, 10
        )
        self.cmd_vel_pub = self.create_publisher(Twist, "/cmd_vel", 10)
        self.servo_cmd_pub = self.create_publisher(JointState, "/servo_cmd", 10)
        self.status_pub = self.create_publisher(
            String, "/tracking_controller/status", 10
        )

        self.create_timer(1.0 / 50.0, self._servo_control_loop)
        self.create_timer(1.0 / 10.0, self._wheel_control_loop)
        self.create_timer(1.0 / 10.0, self._lost_target_check)
        self.create_timer(1.0 / 5.0, self._status_loop)

        self.get_logger().info("Tracking controller started")

    def _declare_parameters(self):
        self.declare_parameter("pid_servo_kp", 2.0)
        self.declare_parameter("pid_servo_ki", 0.0)
        self.declare_parameter("pid_servo_kd", 0.1)
        self.declare_parameter("pid_wheel_yaw_kp", 0.5)
        self.declare_parameter("pid_wheel_yaw_ki", 0.0)
        self.declare_parameter("pid_wheel_yaw_kd", 0.05)
        self.declare_parameter("pid_linear_kp", 0.3)
        self.declare_parameter("pid_linear_ki", 0.0)
        self.declare_parameter("pid_linear_kd", 0.05)
        self.declare_parameter("max_servo_angle", 1.57)
        self.declare_parameter("servo_handoff_threshold", 0.52)
        self.declare_parameter("max_linear_speed", 0.3)
        self.declare_parameter("max_angular_speed", 1.0)
        self.declare_parameter("target_distance_min", 0.15)
        self.declare_parameter("target_distance_max", 0.25)
        self.declare_parameter("front_safety_distance", 0.15)
        self.declare_parameter("front_safety_half_arc_rad", 0.35)
        self.declare_parameter("search_scan_duration", 6.0)
        self.declare_parameter("lost_timeout", 2.0)
        self.declare_parameter("target_confirm_frames", 3)

    def _load_parameters(self):
        for name in [
            "servo",
            "wheel_yaw",
            "linear",
        ]:
            setattr(self, f"{name}_kp", self.get_parameter(f"pid_{name}_kp").value)
            setattr(self, f"{name}_ki", self.get_parameter(f"pid_{name}_ki").value)
            setattr(self, f"{name}_kd", self.get_parameter(f"pid_{name}_kd").value)
        self.max_servo_angle = self.get_parameter("max_servo_angle").value
        self.servo_handoff_threshold = self.get_parameter(
            "servo_handoff_threshold"
        ).value
        self.max_linear_speed = self.get_parameter("max_linear_speed").value
        self.max_angular_speed = self.get_parameter("max_angular_speed").value
        self.target_distance_min = self.get_parameter("target_distance_min").value
        self.target_distance_max = self.get_parameter("target_distance_max").value
        self.front_safety_distance = self.get_parameter("front_safety_distance").value
        self.front_safety_half_arc_rad = self.get_parameter(
            "front_safety_half_arc_rad"
        ).value
        self.search_scan_duration = self.get_parameter("search_scan_duration").value
        self.lost_timeout = self.get_parameter("lost_timeout").value
        self.target_confirm_frames = self.get_parameter("target_confirm_frames").value

    def _on_parameter_change(self, params: list[Parameter]) -> SetParametersResult:
        for param in params:
            if param.name in self.PID_PARAMS and param.value < 0.0:
                return SetParametersResult(
                    successful=False,
                    reason=f"PID gains must be non-negative: {param.name}",
                )
        for param in params:
            if param.name == "pid_servo_kp":
                self.servo_pid.kp = param.value
            elif param.name == "pid_servo_ki":
                self.servo_pid.ki = param.value
            elif param.name == "pid_servo_kd":
                self.servo_pid.kd = param.value
            elif param.name == "pid_wheel_yaw_kp":
                self.yaw_pid.kp = param.value
            elif param.name == "pid_wheel_yaw_ki":
                self.yaw_pid.ki = param.value
            elif param.name == "pid_wheel_yaw_kd":
                self.yaw_pid.kd = param.value
            elif param.name == "pid_linear_kp":
                self.linear_pid.kp = param.value
            elif param.name == "pid_linear_ki":
                self.linear_pid.ki = param.value
            elif param.name == "pid_linear_kd":
                self.linear_pid.kd = param.value
        return SetParametersResult(successful=True)

    def _scan_callback(self, msg: LaserScan):
        self.latest_scan = msg

    def _enabled_callback(self, msg: Bool):
        """Enable/disable controller output based on dashboard mode."""
        if self.enabled and not msg.data:
            self.tracking_state = TrackingState.IDLE
            self.target_confirm_count = 0
            self.servo_pid.reset()
            self.yaw_pid.reset()
            self.linear_pid.reset()
            self.current_servo_angle = 0.0
        self.enabled = msg.data

    def _tracked_callback(self, msg: TrackedPersonArray):
        if not self.enabled:
            return
        current_time = self.get_clock().now().nanoseconds / 1e9
        target = next((person for person in msg.persons if person.is_target), None)
        if target is None:
            return

        self.target_confirm_count += 1
        if self.target_confirm_count >= self.target_confirm_frames:
            self.tracking_state = TrackingState.TRACKING
        self.last_target_time = current_time
        self.last_target_id = target.person_id
        self.last_target_range = target.range_m
        self.last_target_bearing = target.bearing_rad
        self.last_movement_direction = 1.0 if target.bearing_rad >= 0.0 else -1.0

        error = target.bearing_rad - self.current_servo_angle
        servo_delta = self.servo_pid.step(error, 1.0 / 50.0) * (1.0 / 50.0)
        self.current_servo_angle = self._clamp(
            self.current_servo_angle + servo_delta,
            -self.max_servo_angle,
            self.max_servo_angle,
        )

    def _lost_target_check(self):
        """Drive lost-target FSM transitions from a wall-clock timer."""
        if not self.enabled:
            return
        if self.tracking_state == TrackingState.IDLE:
            return
        current_time = self.get_clock().now().nanoseconds / 1e9
        if current_time - self.last_target_time > self.lost_timeout:
            self._handle_target_lost(current_time)

    def _handle_target_lost(self, current_time: float):
        if self.tracking_state == TrackingState.TRACKING:
            self.tracking_state = TrackingState.SEARCH_SCAN
            self.state_start_time = current_time
            self.target_confirm_count = 0
            self.scan_direction = self.last_movement_direction or 1.0
        elif self.tracking_state == TrackingState.SEARCH_SCAN:
            if current_time - self.state_start_time > self.search_scan_duration:
                self.tracking_state = TrackingState.IDLE
                self.state_start_time = current_time
                self.last_target_id = ""
                self.last_target_range = math.nan

    def _servo_control_loop(self):
        if not self.enabled:
            return
        if self.tracking_state == TrackingState.SEARCH_SCAN:
            scan_speed = 2.0 * self.max_servo_angle / self.search_scan_duration
            self.scan_angle += self.scan_direction * scan_speed * (1.0 / 50.0)
            if abs(self.scan_angle) >= self.max_servo_angle:
                self.scan_direction *= -1.0
            self.scan_angle = self._clamp(
                self.scan_angle, -self.max_servo_angle, self.max_servo_angle
            )
            self.current_servo_angle = self.scan_angle

        SERVO_DEADBAND = 0.01
        if (
            not math.isfinite(self._last_published_servo_angle)
            or abs(self.current_servo_angle - self._last_published_servo_angle)
            > SERVO_DEADBAND
        ):
            msg = JointState()
            msg.header = Header()
            msg.header.stamp = self.get_clock().now().to_msg()
            msg.name = ["camera_pan_joint"]
            msg.position = [self.current_servo_angle]
            self.servo_cmd_pub.publish(msg)
            self._last_published_servo_angle = self.current_servo_angle

    def _wheel_control_loop(self):
        if not self.enabled:
            return
        cmd = Twist()
        if self.tracking_state == TrackingState.TRACKING:
            cmd.angular.z = self._tracking_yaw_command()
            cmd.linear.x = self._tracking_linear_command()
        elif self.tracking_state == TrackingState.IDLE:
            self.servo_pid.reset()
            self.yaw_pid.reset()
            self.linear_pid.reset()

        self.obstacle = not self.front_arc_clear(
            self.latest_scan,
            self.front_safety_distance,
            self.front_safety_half_arc_rad,
        )
        if self.obstacle and cmd.linear.x > 0.0:
            cmd.linear.x = 0.0
        self.cmd_vel_pub.publish(cmd)

    def _tracking_yaw_command(self) -> float:
        if abs(self.current_servo_angle) <= self.servo_handoff_threshold:
            self.yaw_pid.reset()
            return 0.0
        yaw = self.yaw_pid.step(self.current_servo_angle, 1.0 / 10.0)
        center_step = 0.5 * (1.0 / 10.0)
        self.current_servo_angle -= math.copysign(
            min(abs(self.current_servo_angle), center_step), self.current_servo_angle
        )
        return yaw

    def _tracking_linear_command(self) -> float:
        if not math.isfinite(self.last_target_range):
            self.linear_pid.reset()
            return 0.0
        if (
            self.target_distance_min
            <= self.last_target_range
            <= self.target_distance_max
        ):
            self.linear_pid.reset()
            return 0.0
        center = (self.target_distance_min + self.target_distance_max) / 2.0
        return self.linear_pid.step(self.last_target_range - center, 1.0 / 10.0)

    def _status_loop(self):
        msg = String()
        range_value = (
            self.last_target_range if math.isfinite(self.last_target_range) else None
        )
        target_id = (
            "" if self.tracking_state == TrackingState.IDLE else self.last_target_id
        )
        msg.data = json.dumps(
            {
                "state": self.tracking_state,
                "target_id": target_id,
                "range_m": range_value,
                "obstacle": self.obstacle,
            }
        )
        self.status_pub.publish(msg)

    @staticmethod
    def front_arc_clear(scan, min_dist=0.3, half_arc_rad=0.35) -> bool:
        """Return false when finite scan ranges inside front arc are too close."""
        if scan is None:
            return True
        for index, distance in enumerate(scan.ranges):
            if not math.isfinite(distance):
                continue
            angle = scan.angle_min + index * scan.angle_increment
            wrapped = math.atan2(math.sin(angle), math.cos(angle))
            if abs(wrapped) <= half_arc_rad and distance < min_dist:
                return False
        return True

    @staticmethod
    def _clamp(value: float, low: float, high: float) -> float:
        return max(low, min(high, value))


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
