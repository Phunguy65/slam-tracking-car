import json
import math
from types import SimpleNamespace

from slam_car_perception.tracking_controller_node import (
    TrackingControllerNode,
    TrackingState,
)


def _fake_controller(
    state=TrackingState.TRACKING, last_target_id="alice", last_target_range=1.2
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
    controller.search_continue_duration = 0.5
    controller.search_scan_duration = 2.0
    controller.search_rotate_duration = 5.0
    controller.lost_timeout = 0.5
    published = []
    controller.status_pub = SimpleNamespace(
        publish=lambda msg: published.append(msg.data)
    )
    controller._published = published
    return controller


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
        state=TrackingState.TRACKING, last_target_id="alice", last_target_range=1.42
    )
    TrackingControllerNode._status_loop(controller)
    payload = json.loads(controller._published[-1])
    assert payload["range_m"] == 1.42


def test_handle_target_lost_advances_to_search_continue():
    controller = _fake_controller(state=TrackingState.TRACKING)
    TrackingControllerNode._handle_target_lost(controller, current_time=10.0)
    assert controller.tracking_state == TrackingState.SEARCH_CONTINUE
    assert controller.state_start_time == 10.0


def test_handle_target_lost_progresses_search_chain():
    controller = _fake_controller(state=TrackingState.SEARCH_CONTINUE)
    controller.state_start_time = 0.0
    TrackingControllerNode._handle_target_lost(controller, current_time=1.0)
    assert controller.tracking_state == TrackingState.SEARCH_SCAN

    controller.state_start_time = 1.0
    TrackingControllerNode._handle_target_lost(controller, current_time=4.0)
    assert controller.tracking_state == TrackingState.SEARCH_ROTATE

    controller.state_start_time = 4.0
    TrackingControllerNode._handle_target_lost(controller, current_time=10.0)
    assert controller.tracking_state == TrackingState.IDLE
    assert controller.last_target_id == ""
    assert math.isnan(controller.last_target_range)


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
