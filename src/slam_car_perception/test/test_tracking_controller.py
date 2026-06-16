import json
import math
from types import SimpleNamespace

from slam_car_perception.tracking_controller_node import (
    PID,
    TrackingControllerNode,
    TrackingState,
)

from slam_car_interfaces.msg import TrackedPerson, TrackedPersonArray


def _fake_controller(
    state=TrackingState.TRACKING, last_target_id="alice", last_target_range=0.2
):
    """Build a controller-like object without touching ROS lifecycle."""
    controller = SimpleNamespace()
    controller.tracking_state = state
    controller.last_target_id = last_target_id
    controller.last_target_range = last_target_range
    controller.last_target_bearing = 0.0
    controller.last_target_time = 0.0
    controller.state_start_time = 0.0
    controller.last_movement_direction = 1.0
    controller.obstacle = False
    controller.search_scan_duration = 6.0
    controller.lost_timeout = 2.0
    controller.target_confirm_count = 0
    controller.target_confirm_frames = 3
    controller.scan_direction = 1.0
    published = []
    controller.status_pub = SimpleNamespace(
        publish=lambda msg: published.append(msg.data)
    )
    controller._published = published
    return controller


def _fake_clock(now_s=0.0):
    return SimpleNamespace(now=lambda: SimpleNamespace(nanoseconds=now_s * 1e9))


def _fake_tracked_controller(target_confirm_frames=3):
    controller = _fake_controller(state=TrackingState.IDLE)
    controller.get_clock = lambda: _fake_clock(1.0)
    controller.current_servo_angle = 0.0
    controller.max_servo_angle = 1.57
    controller.servo_pid = PID()
    controller._clamp = TrackingControllerNode._clamp
    controller.target_confirm_frames = target_confirm_frames
    return controller


def _target_message(person_id="alice", range_m=0.2, bearing_rad=0.1):
    person = TrackedPerson()
    person.is_target = True
    person.person_id = person_id
    person.range_m = range_m
    person.bearing_rad = bearing_rad

    message = TrackedPersonArray()
    message.persons = [person]
    return message


def test_status_clears_target_id_on_idle():
    controller = _fake_controller(
        state=TrackingState.IDLE, last_target_id="alice", last_target_range=math.nan
    )
    TrackingControllerNode._status_loop(controller)
    payload = json.loads(controller._published[-1])
    assert payload["target_id"] == ""
    assert payload["range_m"] is None
    assert payload["state"] == "IDLE"


def test_status_keeps_target_id_during_search():
    controller = _fake_controller(
        state=TrackingState.SEARCH_SCAN,
        last_target_id="alice",
        last_target_range=math.nan,
    )
    TrackingControllerNode._status_loop(controller)
    payload = json.loads(controller._published[-1])
    assert payload["target_id"] == "alice"
    assert payload["range_m"] is None


def test_status_emits_range_when_finite():
    controller = _fake_controller(
        state=TrackingState.TRACKING, last_target_id="alice", last_target_range=0.22
    )
    TrackingControllerNode._status_loop(controller)
    payload = json.loads(controller._published[-1])
    assert payload["range_m"] == 0.22


def test_handle_target_lost_advances_to_search_scan():
    controller = _fake_controller(state=TrackingState.TRACKING)
    controller.target_confirm_count = 3
    TrackingControllerNode._handle_target_lost(controller, current_time=10.0)
    assert controller.tracking_state == TrackingState.SEARCH_SCAN
    assert controller.state_start_time == 10.0
    assert controller.target_confirm_count == 0


def test_handle_target_lost_search_scan_times_out_to_idle():
    controller = _fake_controller(state=TrackingState.SEARCH_SCAN)
    controller.state_start_time = 0.0
    TrackingControllerNode._handle_target_lost(controller, current_time=3.0)
    assert controller.tracking_state == TrackingState.SEARCH_SCAN

    TrackingControllerNode._handle_target_lost(controller, current_time=6.5)
    assert controller.tracking_state == TrackingState.IDLE
    assert controller.last_target_id == ""
    assert math.isnan(controller.last_target_range)


def test_tracked_callback_requires_confirmed_target_frames():
    controller = _fake_tracked_controller(target_confirm_frames=3)
    message = _target_message()

    TrackingControllerNode._tracked_callback(controller, message)
    assert controller.target_confirm_count == 1
    assert controller.tracking_state == TrackingState.IDLE

    TrackingControllerNode._tracked_callback(controller, message)
    assert controller.target_confirm_count == 2
    assert controller.tracking_state == TrackingState.IDLE

    TrackingControllerNode._tracked_callback(controller, message)
    assert controller.target_confirm_count == 3
    assert controller.tracking_state == TrackingState.TRACKING


def test_tracked_callback_reacquires_target_during_search_scan():
    controller = _fake_tracked_controller(target_confirm_frames=3)
    controller.tracking_state = TrackingState.SEARCH_SCAN
    message = _target_message()

    for _ in range(3):
        TrackingControllerNode._tracked_callback(controller, message)

    assert controller.tracking_state == TrackingState.TRACKING
    assert controller.target_confirm_count == 3


def _fake_scan(angle_min, angle_increment, ranges):
    return SimpleNamespace(
        angle_min=angle_min, angle_increment=angle_increment, ranges=ranges
    )


def test_front_arc_clear_blocks_when_obstacle_close():
    scan = _fake_scan(
        angle_min=-math.pi, angle_increment=math.pi / 180.0, ranges=[float("inf")] * 360
    )
    scan.ranges[180] = 0.25
    assert not TrackingControllerNode.front_arc_clear(
        scan, min_dist=0.3, half_arc_rad=0.35
    )


def test_front_arc_clear_passes_when_obstacle_outside_arc():
    scan = _fake_scan(
        angle_min=-math.pi, angle_increment=math.pi / 180.0, ranges=[float("inf")] * 360
    )
    scan.ranges[0] = 0.1
    assert TrackingControllerNode.front_arc_clear(scan, min_dist=0.3, half_arc_rad=0.35)


def test_front_arc_clear_returns_true_when_no_scan():
    assert TrackingControllerNode.front_arc_clear(None)
