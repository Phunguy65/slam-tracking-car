"""
Person tracker node: detects and recognizes people in ESP32-CAM stream.

- Subscribes to /camera/image_raw from cam_bridge_node
- Detects bodies using YOLOv8n (person class)
- Detects faces within bodies using InsightFace
- Matches faces against enrolled embeddings from SQLite
- Publishes TrackedPersonArray to /tracked_persons

Hot-reloads embeddings when database changes.
"""

import os
import sqlite3

import numpy as np
import rclpy
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import Header

from slam_car_interfaces.msg import BoundingBox2D, TrackedPerson, TrackedPersonArray

# Lazy imports for ML libraries
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


class PersonTrackerNode(Node):
    """ROS2 node for person detection and recognition."""

    def __init__(self):
        super().__init__("person_tracker_node")

        # Parameters
        self.declare_parameter("db_path", "~/.slam_car/face_db.sqlite")
        self.declare_parameter("embedding_threshold", 0.6)
        self.declare_parameter("image_topic", "/camera/image_raw")
        self.declare_parameter("body_confidence_threshold", 0.5)
        self.declare_parameter(
            "confidence_decay_rate", 0.1
        )  # per second without face confirmation

        # Initialize state
        self.bridge = CvBridge()
        self.db_path = os.path.expanduser(self.get_parameter("db_path").value)
        self.embedding_threshold = self.get_parameter("embedding_threshold").value
        self.body_confidence_threshold = self.get_parameter(
            "body_confidence_threshold"
        ).value
        self.confidence_decay_rate = self.get_parameter("confidence_decay_rate").value

        # Embedded person database (loaded from SQLite)
        self.enrolled_embeddings: dict[
            str, tuple[str, np.ndarray]
        ] = {}  # id -> (name, embedding)
        self.current_target_id: str | None = None
        self.db_last_modified: float = 0.0

        # Tracking state (for maintaining identity when face not visible)
        self.tracked_persons: dict[
            int, dict
        ] = {}  # track_id -> {person_id, confidence, last_bbox, last_seen}
        self.next_track_id = 0

        # Initialize ML models
        self._init_models()

        # Load initial embeddings
        self._reload_embeddings()

        # ROS interfaces
        image_topic = self.get_parameter("image_topic").value
        self.image_sub = self.create_subscription(
            Image, image_topic, self._image_callback, 10
        )
        self.tracked_pub = self.create_publisher(
            TrackedPersonArray, "/tracked_persons", 10
        )

        # Timer for periodic embedding reload check (every 1 second)
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

            # Load persons
            cursor.execute("SELECT id, name, embedding FROM persons")
            self.enrolled_embeddings = {}
            for row in cursor.fetchall():
                person_id, name, embedding_blob = row
                embedding = np.frombuffer(embedding_blob, dtype=np.float32)
                # Normalize just in case
                embedding = embedding / np.linalg.norm(embedding)
                self.enrolled_embeddings[person_id] = (name, embedding)

            # Load current target
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

    def _image_callback(self, msg: Image):
        """Process incoming camera frames for person tracking."""
        if self.yolo_model is None:
            return

        # Convert ROS image to OpenCV
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        except Exception as e:
            self.get_logger().warn(f"Failed to convert image: {e}")
            return

        h, w = frame.shape[:2]
        current_time = self.get_clock().now().nanoseconds / 1e9

        # Detect bodies using YOLOv8
        results = self.yolo_model(frame, classes=[0], verbose=False)  # class 0 = person

        tracked_persons: list[TrackedPerson] = []
        detected_track_ids = set()

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                conf = float(box.conf[0])
                if conf < self.body_confidence_threshold:
                    continue

                # Body bounding box (xyxy format)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                # Create normalized body bbox
                body_bbox = BoundingBox2D()
                body_bbox.center_x = float((x1 + x2) / 2 / w)
                body_bbox.center_y = float((y1 + y2) / 2 / h)
                body_bbox.width = float((x2 - x1) / w)
                body_bbox.height = float((y2 - y1) / h)

                # Try to match with existing tracks (simple IOU-based)
                track_id = self._match_track(body_bbox, current_time)
                detected_track_ids.add(track_id)

                # Detect face within body bbox
                face_bbox = BoundingBox2D()
                face_visible = False
                person_id = ""
                recognition_confidence = 0.0

                if self.face_app is not None:
                    # Crop body region for face detection
                    x1_int, y1_int = max(0, int(x1)), max(0, int(y1))
                    x2_int, y2_int = min(w, int(x2)), min(h, int(y2))
                    body_crop = frame[y1_int:y2_int, x1_int:x2_int]

                    if body_crop.size > 0:
                        faces = self.face_app.get(body_crop)
                        if len(faces) > 0:
                            # Use largest face
                            face = max(
                                faces,
                                key=lambda f: (f.bbox[2] - f.bbox[0])
                                * (f.bbox[3] - f.bbox[1]),
                            )
                            fx1, fy1, fx2, fy2 = face.bbox

                            # Convert face bbox to full image coordinates (normalized)
                            face_bbox.center_x = float((x1_int + (fx1 + fx2) / 2) / w)
                            face_bbox.center_y = float((y1_int + (fy1 + fy2) / 2) / h)
                            face_bbox.width = float((fx2 - fx1) / w)
                            face_bbox.height = float((fy2 - fy1) / h)
                            face_visible = True

                            # Try to recognize face
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

                                    # Update track with recognized person
                                    self.tracked_persons[track_id]["person_id"] = (
                                        person_id
                                    )
                                    self.tracked_persons[track_id]["confidence"] = (
                                        recognition_confidence
                                    )
                                    self.tracked_persons[track_id]["last_face_time"] = (
                                        current_time
                                    )

                # If face not visible, use tracked identity with decaying confidence
                if not face_visible and track_id in self.tracked_persons:
                    track_info = self.tracked_persons[track_id]
                    if track_info.get("person_id"):
                        person_id = track_info["person_id"]
                        # Decay confidence
                        time_since_face = current_time - track_info.get(
                            "last_face_time", current_time
                        )
                        recognition_confidence = max(
                            0.0,
                            track_info.get("confidence", 0.0)
                            - time_since_face * self.confidence_decay_rate,
                        )

                # Determine if this is the target
                is_target = False
                if self.current_target_id:
                    # Target mode: only mark the specific person as target
                    is_target = person_id == self.current_target_id
                else:
                    # No target set: mark largest/closest person as target
                    # Will be determined after processing all persons
                    pass

                # Create TrackedPerson message
                tracked_person = TrackedPerson()
                tracked_person.person_id = person_id
                tracked_person.confidence = recognition_confidence
                tracked_person.is_target = is_target
                tracked_person.body_bbox = body_bbox
                tracked_person.face_bbox = face_bbox
                tracked_person.face_visible = face_visible

                tracked_persons.append(tracked_person)

        # If no target is set, mark largest body as target
        if not self.current_target_id and len(tracked_persons) > 0:
            largest_idx = max(
                range(len(tracked_persons)),
                key=lambda i: tracked_persons[i].body_bbox.width
                * tracked_persons[i].body_bbox.height,
            )
            tracked_persons[largest_idx].is_target = True

        # Clean up old tracks
        for track_id in list(self.tracked_persons.keys()):
            if track_id not in detected_track_ids:
                if (
                    current_time - self.tracked_persons[track_id].get("last_seen", 0)
                    > 1.0
                ):
                    del self.tracked_persons[track_id]

        # Publish result
        msg_out = TrackedPersonArray()
        msg_out.header = Header()
        msg_out.header.stamp = msg.header.stamp
        msg_out.header.frame_id = msg.header.frame_id
        msg_out.persons = tracked_persons

        self.tracked_pub.publish(msg_out)

    def _match_track(self, bbox: BoundingBox2D, current_time: float) -> int:
        """Match bbox to existing track or create new one."""
        best_iou = 0.0
        best_track_id = None

        for track_id, track_info in self.tracked_persons.items():
            last_bbox = track_info.get("last_bbox")
            if last_bbox is None:
                continue

            iou = self._compute_iou(bbox, last_bbox)
            if iou > best_iou and iou > 0.3:  # Minimum IOU threshold
                best_iou = iou
                best_track_id = track_id

        if best_track_id is not None:
            # Update existing track
            self.tracked_persons[best_track_id]["last_bbox"] = bbox
            self.tracked_persons[best_track_id]["last_seen"] = current_time
            return best_track_id
        else:
            # Create new track
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
        # Convert center/size to corners
        x1_min = bbox1.center_x - bbox1.width / 2
        x1_max = bbox1.center_x + bbox1.width / 2
        y1_min = bbox1.center_y - bbox1.height / 2
        y1_max = bbox1.center_y + bbox1.height / 2

        x2_min = bbox2.center_x - bbox2.width / 2
        x2_max = bbox2.center_x + bbox2.width / 2
        y2_min = bbox2.center_y - bbox2.height / 2
        y2_max = bbox2.center_y + bbox2.height / 2

        # Compute intersection
        inter_x_min = max(x1_min, x2_min)
        inter_y_min = max(y1_min, y2_min)
        inter_x_max = min(x1_max, x2_max)
        inter_y_max = min(y1_max, y2_max)

        if inter_x_max <= inter_x_min or inter_y_max <= inter_y_min:
            return 0.0

        inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)

        # Compute union
        area1 = bbox1.width * bbox1.height
        area2 = bbox2.width * bbox2.height
        union_area = area1 + area2 - inter_area

        return inter_area / union_area if union_area > 0 else 0.0

    def _match_embedding(self, embedding: np.ndarray) -> tuple[str, float]:
        """Match embedding against enrolled persons. Returns (person_id, score)."""
        best_id = ""
        best_score = 0.0

        for person_id, (name, enrolled_emb) in self.enrolled_embeddings.items():
            # Cosine similarity (embeddings are normalized)
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
