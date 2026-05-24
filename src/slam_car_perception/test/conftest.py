import sys
import types


class Message:
    pass


class BoundingBox2D(Message):
    def __init__(self):
        self.center_x = 0.0
        self.center_y = 0.0
        self.width = 0.0
        self.height = 0.0


class TrackedPerson(Message):
    pass


class TrackedPersonArray(Message):
    pass


class Header(Message):
    pass


class String(Message):
    pass


class Twist(Message):
    def __init__(self):
        self.linear = types.SimpleNamespace(x=0.0)
        self.angular = types.SimpleNamespace(z=0.0)


class JointState(Message):
    pass


class LaserScan(Message):
    pass


class CameraInfo(Message):
    pass


class Image(Message):
    pass


class PointStamped(Message):
    def __init__(self):
        self.header = types.SimpleNamespace(frame_id="", stamp=None)
        self.point = types.SimpleNamespace(x=0.0, y=0.0, z=0.0)


def install_stub(name, module):
    sys.modules.setdefault(name, module)


rclpy = types.ModuleType("rclpy")
rclpy.init = lambda *args, **kwargs: None
rclpy.spin = lambda *args, **kwargs: None
rclpy.shutdown = lambda *args, **kwargs: None
rclpy_time = types.ModuleType("rclpy.time")
rclpy_time.Time = lambda *args, **kwargs: None
rclpy.time = rclpy_time
rclpy_node = types.ModuleType("rclpy.node")
rclpy_node.Node = object
rclpy_parameter = types.ModuleType("rclpy.parameter")
rclpy_parameter.Parameter = object

sensor_msgs = types.ModuleType("sensor_msgs")
sensor_msgs_msg = types.ModuleType("sensor_msgs.msg")
sensor_msgs_msg.CameraInfo = CameraInfo
sensor_msgs_msg.Image = Image
sensor_msgs_msg.JointState = JointState
sensor_msgs_msg.LaserScan = LaserScan

std_msgs = types.ModuleType("std_msgs")
std_msgs_msg = types.ModuleType("std_msgs.msg")
std_msgs_msg.Header = Header
std_msgs_msg.String = String

geometry_msgs = types.ModuleType("geometry_msgs")
geometry_msgs_msg = types.ModuleType("geometry_msgs.msg")
geometry_msgs_msg.PointStamped = PointStamped
geometry_msgs_msg.Twist = Twist

slam_car_interfaces = types.ModuleType("slam_car_interfaces")
slam_car_interfaces_msg = types.ModuleType("slam_car_interfaces.msg")
slam_car_interfaces_msg.BoundingBox2D = BoundingBox2D
slam_car_interfaces_msg.TrackedPerson = TrackedPerson
slam_car_interfaces_msg.TrackedPersonArray = TrackedPersonArray

rcl_interfaces = types.ModuleType("rcl_interfaces")
rcl_interfaces_msg = types.ModuleType("rcl_interfaces.msg")
rcl_interfaces_msg.SetParametersResult = lambda **kwargs: types.SimpleNamespace(
    **kwargs
)

cv_bridge = types.ModuleType("cv_bridge")
cv_bridge.CvBridge = object

tf2_ros = types.ModuleType("tf2_ros")
tf2_ros.Buffer = object
tf2_ros.TransformListener = object

tf2_geometry_msgs = types.ModuleType("tf2_geometry_msgs")
tf2_geometry_msgs.do_transform_point = lambda point, transform: point

install_stub("rclpy", rclpy)
install_stub("rclpy.time", rclpy_time)
install_stub("rclpy.node", rclpy_node)
install_stub("rclpy.parameter", rclpy_parameter)
install_stub("sensor_msgs", sensor_msgs)
install_stub("sensor_msgs.msg", sensor_msgs_msg)
install_stub("std_msgs", std_msgs)
install_stub("std_msgs.msg", std_msgs_msg)
install_stub("geometry_msgs", geometry_msgs)
install_stub("geometry_msgs.msg", geometry_msgs_msg)
install_stub("slam_car_interfaces", slam_car_interfaces)
install_stub("slam_car_interfaces.msg", slam_car_interfaces_msg)
install_stub("rcl_interfaces", rcl_interfaces)
install_stub("rcl_interfaces.msg", rcl_interfaces_msg)
install_stub("cv_bridge", cv_bridge)
install_stub("tf2_ros", tf2_ros)
install_stub("tf2_geometry_msgs", tf2_geometry_msgs)
