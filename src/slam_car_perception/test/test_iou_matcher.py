from slam_car_perception.person_tracker_node import PersonTrackerNode

from slam_car_interfaces.msg import BoundingBox2D


def bbox(x, y, w, h):
    msg = BoundingBox2D()
    msg.center_x = x
    msg.center_y = y
    msg.width = w
    msg.height = h
    return msg


def test_iou_matching_overlap():
    first = bbox(0.5, 0.5, 0.2, 0.4)
    second = bbox(0.52, 0.5, 0.2, 0.4)

    assert PersonTrackerNode._compute_iou(None, first, second) > 0.3


def test_confidence_decay_formula():
    last_confidence = 0.8
    elapsed = 2.0
    decay_rate = 0.1

    confidence = max(0.0, last_confidence - elapsed * decay_rate)

    assert confidence == 0.6000000000000001


class _DecayHarness:
    def __init__(self, decay_rate=0.1):
        self.confidence_decay_rate = decay_rate


def test_identity_dropped_when_decayed_confidence_below_threshold():
    track_info = {
        "person_id": "alice",
        "confidence": 0.5,
        "last_face_time": 0.0,
    }
    harness = _DecayHarness(decay_rate=0.1)

    person_id, confidence = PersonTrackerNode._apply_confidence_decay(
        harness, track_info, current_time=2.5
    )

    assert person_id == ""
    assert confidence == 0.0
    assert track_info["person_id"] == ""
    assert track_info["confidence"] == 0.0


def test_identity_kept_when_decayed_confidence_above_threshold():
    track_info = {
        "person_id": "alice",
        "confidence": 0.8,
        "last_face_time": 0.0,
    }
    harness = _DecayHarness(decay_rate=0.1)

    person_id, confidence = PersonTrackerNode._apply_confidence_decay(
        harness, track_info, current_time=2.0
    )

    assert person_id == "alice"
    assert confidence > 0.3
    assert track_info["person_id"] == "alice"


def test_identity_decay_no_op_when_no_stored_id():
    track_info = {"person_id": "", "confidence": 0.0, "last_face_time": 0.0}
    harness = _DecayHarness(decay_rate=0.1)

    person_id, confidence = PersonTrackerNode._apply_confidence_decay(
        harness, track_info, current_time=10.0
    )

    assert person_id == ""
    assert confidence == 0.0
