"""
Person tracker node: detects and recognizes people in ESP32-CAM stream.

- Subscribes to /camera/image_raw from cam_bridge_node
- Detects bodies using YOLOv8n (person class)
- Detects faces within bodies using InsightFace
- Matches faces against enrolled embeddings from SQLite
- Publishes TrackedPersonArray to /tracked_persons

Hot-reloads embeddings when database changes.
"""

import math
import os
import sqlite3
import time

import numpy as np
import rclpy
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import CameraInfo, Image, JointState, LaserScan
from std_msgs.msg import Header

from slam_car_interfaces.msg import BoundingBox2D, TrackedPerson, TrackedPersonArray
from slam_car_perception.bearing_transform import BearingTransform

try:
    from ultralytics import YOLO

    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

try:
    from insightface.app import FaceAnalysis

    HAS_INSIGHTFACE = True
except ImportError:
    HAS_INSIGHTFACE = False


class _TFLookupError(Exception):
    """Raised when TF lookup for the camera-to-laser bearing fails."""


class PersonTrackerNode(Node):
    """ROS2 node for person detection and recognition."""

    def __init__(self):
        super().__init__("person_tracker_node")

        self.declare_parameter("db_path", "~/.slam_car/face_db.sqlite")
        self.declare_parameter("embedding_threshold", 0.6)
        self.declare_parameter("image_topic", "/camera/image_raw")
        self.declare_parameter("body_confidence_threshold", 0.5)
        self.declare_parameter("confidence_decay_rate", 0.1)
        self.declare_parameter("camera_fov_horizontal_deg", 62.0)
        self.declare_parameter("range_cone_half_angle_rad", 0.17)

        self.bridge = CvBridge()
        self.db_path = os.path.expanduser(self.get_parameter("db_path").value)
        self.embedding_threshold = self.get_parameter("embedding_threshold").value
        self.body_confidence_threshold = self.get_parameter(
            "body_confidence_threshold"
        ).value
        self.confidence_decay_rate = self.get_parameter("confidence_decay_rate").value
        self.range_cone_half_angle_rad = self.get_parameter(
            "range_cone_half_angle_rad"
        ).value
        self.latest_scan = None
        self.camera_info = None
        self.last_no_match_warning = 0.0
        self.last_tf_warning = 0.0
        self.last_camera_info_warning = 0.0
        self.bearing_transform = BearingTransform(self)

        self.enrolled_embeddings: dict[str, tuple[str, np.ndarray]] = {}
        self.current_target_id: str | None = None
        self.db_last_modified: float = 0.0

        self.tracked_persons: dict[int, dict] = {}
        self.next_track_id = 0

        self._init_models()

        self._reload_embeddings()

        image_topic = self.get_parameter("image_topic").value
        self.image_sub = self.create_subscription(
            Image, image_topic, self._image_callback, 10
        )
        self.scan_sub = self.create_subscription(
            LaserScan, "/scan", self._scan_callback, 10
        )
        self.joint_state_sub = self.create_subscription(
            JointState, "/joint_states", self._joint_state_callback, 10
        )
        self.camera_info_sub = self.create_subscription(
            CameraInfo, "/camera_info", self._camera_info_callback, 10
        )
        self.tracked_pub = self.create_publisher(
            TrackedPersonArray, "/tracked_persons", 10
        )

        self.create_timer(1.0, self._check_db_changes)

        self.get_logger().info(f"Person tracker started (db: {self.db_path})")

    def _init_models(self):
        """Initialize YOLOv8 and InsightFace models."""
        self.yolo_model = None
        self.face_app = None

        if HAS_YOLO:
            try:
                self.yolo_model = YOLO("yolov8n.pt")
                self.get_logger().info("YOLOv8n model loaded")
            except Exception as e:
                self.get_logger().error(f"Failed to load YOLOv8: {e}")

        if HAS_INSIGHTFACE:
            try:
                self.face_app = FaceAnalysis(
                    name="buffalo_l", providers=["CPUExecutionProvider"]
                )
                self.face_app.prepare(ctx_id=-1, det_size=(640, 640))
                self.get_logger().info("InsightFace buffalo_l model loaded")
            except Exception as e:
                self.get_logger().error(f"Failed to load InsightFace: {e}")

    def _reload_embeddings(self):
        """Load embeddings from SQLite database."""
        if not os.path.exists(self.db_path):
            return

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT id, name, embedding FROM persons")
            self.enrolled_embeddings = {}
            for row in cursor.fetchall():
                person_id, name, embedding_blob = row
                embedding = np.frombuffer(embedding_blob, dtype=np.float32)
                embedding = embedding / np.linalg.norm(embedding)
                self.enrolled_embeddings[person_id] = (name, embedding)

            cursor.execute("SELECT person_id FROM tracking_target WHERE id = 1")
            row = cursor.fetchone()
            self.current_target_id = row[0] if row and row[0] else None

            conn.close()

            self.db_last_modified = os.path.getmtime(self.db_path)
            self.get_logger().info(
                f"Loaded {len(self.enrolled_embeddings)} enrolled persons"
            )

        except Exception as e:
            self.get_logger().error(f"Failed to load embeddings: {e}")

    def _check_db_changes(self):
        """Check if database has been modified and reload if needed."""
        if not os.path.exists(self.db_path):
            return

        try:
            mtime = os.path.getmtime(self.db_path)
            if mtime > self.db_last_modified:
                self.get_logger().info("Database changed, reloading embeddings...")
                self._reload_embeddings()
        except Exception as e:
            self.get_logger().warn(f"Failed to check database: {e}")

    def _scan_callback(self, msg: LaserScan):
        """Cache latest LiDAR scan."""
        self.latest_scan = msg

    def _joint_state_callback(self, msg: JointState):
        """Keep TF joint-state subscription alive for launch contract."""
        pass

    def _camera_info_callback(self, msg: CameraInfo):
        """Cache latest camera intrinsics."""
        self.camera_info = msg

    def _warn_limited(self, key: str, message: str):
        """Log warning at most once per second for noisy fusion failures."""
        now = time.monotonic()
        last_attr = f"last_{key}_warning"
        if now - getattr(self, last_attr) >= 1.0:
            self.get_logger().warn(message)
            setattr(self, last_attr, now)

    def _image_callback(self, msg: Image):
        """Process incoming camera frames for person tracking."""
        if self.yolo_model is None:
            return

        if self.camera_info is None:
            self._warn_limited(
                "camera_info", "Skipping frame: /camera_info not received"
            )
            return

        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        except Exception as e:
            self.get_logger().warn(f"Failed to convert image: {e}")
            return

        h, w = frame.shape[:2]
        current_time = self.get_clock().now().nanoseconds / 1e9

        results = self.yolo_model(frame, classes=[0], verbose=False)

        tracked_persons: list[TrackedPerson] = []
        detected_track_ids = set()

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                conf = float(box.conf[0])
                if conf < self.body_confidence_threshold:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                body_bbox = BoundingBox2D()
                body_bbox.center_x = float((x1 + x2) / 2 / w)
                body_bbox.center_y = float((y1 + y2) / 2 / h)
                body_bbox.width = float((x2 - x1) / w)
                body_bbox.height = float((y2 - y1) / h)

                track_id = self._match_track(body_bbox, current_time)
                detected_track_ids.add(track_id)

                face_bbox = BoundingBox2D()
                face_visible = False
                person_id = ""
                recognition_confidence = 0.0

                if self.face_app is not None:
                    x1_int, y1_int = max(0, int(x1)), max(0, int(y1))
                    x2_int, y2_int = min(w, int(x2)), min(h, int(y2))
                    body_crop = frame[y1_int:y2_int, x1_int:x2_int]

                    if body_crop.size > 0:
                        faces = self.face_app.get(body_crop)
                        if len(faces) > 0:
                            face = max(
                                faces,
                                key=lambda f: (f.bbox[2] - f.bbox[0])
                                * (f.bbox[3] - f.bbox[1]),
                            )
                            fx1, fy1, fx2, fy2 = face.bbox

                            face_bbox.center_x = float((x1_int + (fx1 + fx2) / 2) / w)
                            face_bbox.center_y = float((y1_int + (fy1 + fy2) / 2) / h)
                            face_bbox.width = float((fx2 - fx1) / w)
                            face_bbox.height = float((fy2 - fy1) / h)
                            face_visible = True

                            if (
                                face.embedding is not None
                                and len(self.enrolled_embeddings) > 0
                            ):
                                embedding = face.embedding / np.linalg.norm(
                                    face.embedding
                                )
                                best_match_id, best_score = self._match_embedding(
                                    embedding
                                )

                                if best_score >= self.embedding_threshold:
                                    person_id = best_match_id
                                    recognition_confidence = best_score

                                    self.tracked_persons[track_id]["person_id"] = (
                                        person_id
                                    )
                                    self.tracked_persons[track_id]["confidence"] = (
                                        recognition_confidence
                                    )
                                    self.tracked_persons[track_id]["last_face_time"] = (
                                        current_time
                                    )

                if not face_visible and track_id in self.tracked_persons:
                    track_info = self.tracked_persons[track_id]
                    person_id, recognition_confidence = self._apply_confidence_decay(
                        track_info, current_time
                    )

                is_target = False
                if self.current_target_id:
                    is_target = person_id == self.current_target_id
                else:
                    pass

                try:
                    range_m, bearing_rad = self._assign_metric_range(
                        body_bbox, w, msg.header.stamp
                    )
                except _TFLookupError:
                    self._warn_limited("tf", "Skipping frame: TF lookup failed")
                    return

                tracked_person = TrackedPerson()
                tracked_person.person_id = person_id
                tracked_person.confidence = recognition_confidence
                tracked_person.is_target = is_target
                tracked_person.body_bbox = body_bbox
                tracked_person.face_bbox = face_bbox
                tracked_person.face_visible = face_visible
                tracked_person.range_m = range_m
                tracked_person.bearing_rad = bearing_rad

                tracked_persons.append(tracked_person)

        if not self.current_target_id and len(tracked_persons) > 0:
            largest_idx = max(
                range(len(tracked_persons)),
                key=lambda i: tracked_persons[i].body_bbox.width
                * tracked_persons[i].body_bbox.height,
            )
            tracked_persons[largest_idx].is_target = True

        for track_id in list(self.tracked_persons.keys()):
            if track_id not in detected_track_ids:
                if (
                    current_time - self.tracked_persons[track_id].get("last_seen", 0)
                    > 1.0
                ):
                    del self.tracked_persons[track_id]

        msg_out = TrackedPersonArray()
        msg_out.header = Header()
        msg_out.header.stamp = msg.header.stamp
        msg_out.header.frame_id = "laser_link"
        msg_out.persons = tracked_persons

        self.tracked_pub.publish(msg_out)

    def _assign_metric_range(self, body_bbox: BoundingBox2D, width: int, stamp):
        """Fuse body bearing with the closest valid LiDAR ray in its cone."""
        body_center_u = body_bbox.center_x * width
        try:
            bearing_rad = self.bearing_transform.pixel_to_laser_bearing(
                body_center_u,
                width,
                self.camera_info.k,
                stamp,
            )
        except Exception as exc:
            self._warn_limited("tf", f"Skipping frame: TF lookup failed: {exc}")
            raise _TFLookupError(str(exc)) from exc

        if self.latest_scan is None:
            self._warn_limited("no_match", "No LiDAR range match: /scan not received")
            return math.nan, bearing_rad

        valid_ranges = []
        for index, range_m in enumerate(self.latest_scan.ranges):
            if not math.isfinite(range_m) or range_m < 0.3 or range_m > 4.0:
                continue
            ray_angle = (
                self.latest_scan.angle_min + index * self.latest_scan.angle_increment
            )
            angle_error = abs(
                math.atan2(
                    math.sin(ray_angle - bearing_rad),
                    math.cos(ray_angle - bearing_rad),
                )
            )
            if angle_error <= self.range_cone_half_angle_rad:
                valid_ranges.append(range_m)

        if not valid_ranges:
            self._warn_limited("no_match", "No LiDAR range match within bearing cone")
            return math.nan, bearing_rad

        return float(min(valid_ranges)), float(bearing_rad)

    def _apply_confidence_decay(self, track_info: dict, current_time: float):
        """Decay confidence over time and drop identity when below threshold."""
        stored_id = track_info.get("person_id", "")
        if not stored_id:
            return "", 0.0

        time_since_face = current_time - track_info.get("last_face_time", current_time)
        decayed = max(
            0.0,
            track_info.get("confidence", 0.0)
            - time_since_face * self.confidence_decay_rate,
        )

        if decayed < 0.3:
            track_info["person_id"] = ""
            track_info["confidence"] = 0.0
            return "", 0.0

        return stored_id, decayed

    def _match_track(self, bbox: BoundingBox2D, current_time: float) -> int:
        """Match bbox to existing track or create new one."""
        best_iou = 0.0
        best_track_id = None

        for track_id, track_info in self.tracked_persons.items():
            last_bbox = track_info.get("last_bbox")
            if last_bbox is None:
                continue

            iou = self._compute_iou(bbox, last_bbox)
            if iou > best_iou and iou > 0.3:
                best_iou = iou
                best_track_id = track_id

        if best_track_id is not None:
            self.tracked_persons[best_track_id]["last_bbox"] = bbox
            self.tracked_persons[best_track_id]["last_seen"] = current_time
            return best_track_id
        else:
            track_id = self.next_track_id
            self.next_track_id += 1
            self.tracked_persons[track_id] = {
                "person_id": "",
                "confidence": 0.0,
                "last_bbox": bbox,
                "last_seen": current_time,
                "last_face_time": 0.0,
            }
            return track_id

    def _compute_iou(self, bbox1: BoundingBox2D, bbox2: BoundingBox2D) -> float:
        """Compute Intersection over Union between two bounding boxes."""
        x1_min = bbox1.center_x - bbox1.width / 2
        x1_max = bbox1.center_x + bbox1.width / 2
        y1_min = bbox1.center_y - bbox1.height / 2
        y1_max = bbox1.center_y + bbox1.height / 2

        x2_min = bbox2.center_x - bbox2.width / 2
        x2_max = bbox2.center_x + bbox2.width / 2
        y2_min = bbox2.center_y - bbox2.height / 2
        y2_max = bbox2.center_y + bbox2.height / 2

        inter_x_min = max(x1_min, x2_min)
        inter_y_min = max(y1_min, y2_min)
        inter_x_max = min(x1_max, x2_max)
        inter_y_max = min(y1_max, y2_max)

        if inter_x_max <= inter_x_min or inter_y_max <= inter_y_min:
            return 0.0

        inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)

        area1 = bbox1.width * bbox1.height
        area2 = bbox2.width * bbox2.height
        union_area = area1 + area2 - inter_area

        return inter_area / union_area if union_area > 0 else 0.0

    def _match_embedding(self, embedding: np.ndarray) -> tuple[str, float]:
        """Match embedding against enrolled persons. Returns (person_id, score)."""
        best_id = ""
        best_score = 0.0

        for person_id, (_name, enrolled_emb) in self.enrolled_embeddings.items():
            score = float(np.dot(embedding, enrolled_emb))
            if score > best_score:
                best_score = score
                best_id = person_id

        return best_id, best_score


def main(args=None):
    rclpy.init(args=args)
    node = PersonTrackerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
