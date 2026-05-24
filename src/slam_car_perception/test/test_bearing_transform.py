import math
from types import SimpleNamespace

from slam_car_perception.bearing_transform import BearingTransform


class FakeBuffer:
    def lookup_transform(self, target_frame, source_frame, stamp):
        return SimpleNamespace(transform=SimpleNamespace())


class FakeListener:
    def __init__(self, buffer, node):
        self.buffer = buffer
        self.node = node


def test_pixel_to_laser_bearing_identity(monkeypatch):
    def fake_transform(point, transform):
        return point

    monkeypatch.setattr(
        "slam_car_perception.bearing_transform.tf2_ros.Buffer", FakeBuffer
    )
    monkeypatch.setattr(
        "slam_car_perception.bearing_transform.tf2_ros.TransformListener", FakeListener
    )
    monkeypatch.setattr(
        "slam_car_perception.bearing_transform.tf2_geometry_msgs.do_transform_point",
        fake_transform,
    )

    transform = BearingTransform(SimpleNamespace())
    bearing = transform.pixel_to_laser_bearing(
        420.0,
        640,
        [500.0, 0.0, 320.0, 0.0, 500.0, 240.0, 0.0, 0.0, 1.0],
        SimpleNamespace(),
    )

    assert math.isclose(bearing, 0.0, abs_tol=1e-9)


def test_pixel_to_laser_bearing_optical_to_laser_rotation(monkeypatch):
    """Optical→laser rotation maps an off-center pixel to its theta_cam magnitude."""

    def rotate_optical_to_laser(point, transform):
        rotated = SimpleNamespace()
        rotated.header = point.header
        rotated.point = SimpleNamespace(
            x=point.point.z,
            y=-point.point.x,
            z=-point.point.y,
        )
        return rotated

    monkeypatch.setattr(
        "slam_car_perception.bearing_transform.tf2_ros.Buffer", FakeBuffer
    )
    monkeypatch.setattr(
        "slam_car_perception.bearing_transform.tf2_ros.TransformListener", FakeListener
    )
    monkeypatch.setattr(
        "slam_car_perception.bearing_transform.tf2_geometry_msgs.do_transform_point",
        rotate_optical_to_laser,
    )

    transform = BearingTransform(SimpleNamespace())
    bearing = transform.pixel_to_laser_bearing(
        420.0,
        640,
        [500.0, 0.0, 320.0, 0.0, 500.0, 240.0, 0.0, 0.0, 1.0],
        SimpleNamespace(),
    )

    expected = -math.atan(100.0 / 500.0)
    assert math.isclose(bearing, expected, abs_tol=1e-6)
