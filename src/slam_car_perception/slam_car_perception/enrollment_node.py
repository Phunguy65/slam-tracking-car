"""
Enrollment node: manages face enrollment and person database.

- Subscribes to /enrollment/image (CompressedImage from webcam via rosbridge)
- Detects faces using YOLOv8n
- Extracts embeddings using InsightFace (buffalo_l)
- Publishes enrollment status to /enrollment/status
- Provides services for CRUD operations on persons and tracking target

Database stored at ~/.slam_car/face_db.sqlite
"""

import base64
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import rclpy
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage

from slam_car_interfaces.msg import BoundingBox2D, EnrolledPerson, EnrollmentStatus
from slam_car_interfaces.srv import (
    AddPerson,
    GetTrackingTarget,
    ListPersons,
    RemovePerson,
    SetTrackingTarget,
)

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


class EnrollmentNode(Node):
    """ROS2 node for face enrollment and person database management."""

    STATUS_IDLE = 0
    STATUS_FACE_DETECTED = 1
    STATUS_SCANNING = 2
    STATUS_READY = 3
    STATUS_NO_FACE = 4

    def __init__(self):
        super().__init__("enrollment_node")

        self.declare_parameter("db_path", "~/.slam_car/face_db.sqlite")
        self.declare_parameter("embedding_threshold", 0.6)
        self.declare_parameter("scan_frames", 10)

        self.bridge = CvBridge()
        self.current_status = self.STATUS_IDLE
        self.current_face_bbox: BoundingBox2D | None = None
        self.scan_progress = 0.0
        self.scan_embeddings: list = []
        self.ready_embedding: np.ndarray | None = None
        self.ready_thumbnail: bytes | None = None
        self.last_face_time: float = 0.0
        self.no_face_timeout = 0.5

        db_path = os.path.expanduser(self.get_parameter("db_path").value)
        self._init_database(db_path)

        self._init_models()

        self.status_pub = self.create_publisher(
            EnrollmentStatus, "/enrollment/status", 10
        )

        self.image_sub = self.create_subscription(
            CompressedImage, "/enrollment/image", self._image_callback, 10
        )

        self.add_person_srv = self.create_service(
            AddPerson, "/enrollment/add_person", self._add_person_callback
        )
        self.remove_person_srv = self.create_service(
            RemovePerson, "/enrollment/remove_person", self._remove_person_callback
        )
        self.list_persons_srv = self.create_service(
            ListPersons, "/enrollment/list_persons", self._list_persons_callback
        )
        self.set_target_srv = self.create_service(
            SetTrackingTarget, "/enrollment/set_target", self._set_target_callback
        )
        self.get_target_srv = self.create_service(
            GetTrackingTarget, "/enrollment/get_target", self._get_target_callback
        )

        self.create_timer(0.1, self._status_timer_callback)

        self.get_logger().info(f"Enrollment node started (db: {db_path})")

    def _init_database(self, db_path: str):
        """Initialize SQLite database with schema."""
        db_dir = Path(db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = db_path
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS persons (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                embedding BLOB NOT NULL,
                thumbnail BLOB NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tracking_target (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                person_id TEXT,
                FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("""
            INSERT OR IGNORE INTO tracking_target (id, person_id) VALUES (1, NULL)
        """)

        conn.commit()
        conn.close()

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

    def _image_callback(self, msg: CompressedImage):
        """Process incoming webcam frames for enrollment."""
        if self.yolo_model is None or self.face_app is None:
            return

        try:
            np_arr = np.frombuffer(msg.data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                return
        except Exception as e:
            self.get_logger().warn(f"Failed to decode image: {e}")
            return

        h, w = frame.shape[:2]

        faces = self.face_app.get(frame)

        if len(faces) == 0:
            if self.current_status in [self.STATUS_FACE_DETECTED, self.STATUS_SCANNING]:
                self.current_status = self.STATUS_NO_FACE
                self._reset_scan()
            elif self.current_status == self.STATUS_READY:
                pass
            else:
                self.current_status = self.STATUS_IDLE
            return

        face = max(
            faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
        )
        self.last_face_time = self.get_clock().now().nanoseconds / 1e9

        x1, y1, x2, y2 = face.bbox
        self.current_face_bbox = BoundingBox2D()
        self.current_face_bbox.center_x = float((x1 + x2) / 2 / w)
        self.current_face_bbox.center_y = float((y1 + y2) / 2 / h)
        self.current_face_bbox.width = float((x2 - x1) / w)
        self.current_face_bbox.height = float((y2 - y1) / h)

        if (
            self.current_status == self.STATUS_IDLE
            or self.current_status == self.STATUS_NO_FACE
        ):
            self.current_status = self.STATUS_FACE_DETECTED
            self._reset_scan()

        if self.current_status == self.STATUS_FACE_DETECTED:
            self.current_status = self.STATUS_SCANNING

        if self.current_status == self.STATUS_SCANNING:
            if face.embedding is not None:
                self.scan_embeddings.append(face.embedding)
                scan_frames = self.get_parameter("scan_frames").value
                self.scan_progress = len(self.scan_embeddings) / scan_frames

                if len(self.scan_embeddings) >= scan_frames:
                    avg_embedding = np.mean(self.scan_embeddings, axis=0)
                    self.ready_embedding = avg_embedding / np.linalg.norm(avg_embedding)

                    x1_int, y1_int = max(0, int(x1)), max(0, int(y1))
                    x2_int, y2_int = min(w, int(x2)), min(h, int(y2))
                    face_crop = frame[y1_int:y2_int, x1_int:x2_int]
                    if face_crop.size > 0:
                        thumbnail = cv2.resize(face_crop, (128, 128))
                        _, jpeg_data = cv2.imencode(".jpg", thumbnail)
                        self.ready_thumbnail = jpeg_data.tobytes()

                    self.current_status = self.STATUS_READY
                    self.scan_progress = 1.0

    def _reset_scan(self):
        """Reset scanning state."""
        self.scan_embeddings = []
        self.scan_progress = 0.0
        self.ready_embedding = None
        self.ready_thumbnail = None

    def _status_timer_callback(self):
        """Publish enrollment status and check for timeout."""
        current_time = self.get_clock().now().nanoseconds / 1e9
        if self.current_status == self.STATUS_SCANNING:
            if current_time - self.last_face_time > self.no_face_timeout:
                self.current_status = self.STATUS_NO_FACE
                self._reset_scan()

        status_msg = EnrollmentStatus()
        status_msg.status = self.current_status
        status_msg.scan_progress = self.scan_progress
        if self.current_face_bbox is not None:
            status_msg.face_bbox = self.current_face_bbox
        else:
            status_msg.face_bbox = BoundingBox2D()

        self.status_pub.publish(status_msg)

    def _add_person_callback(self, request, response):
        """Handle AddPerson service request."""
        response.success = False
        response.person_id = ""
        response.error_message = ""

        if not request.name or request.name.strip() == "":
            response.error_message = "Name is required"
            return response

        if self.current_status != self.STATUS_READY:
            response.error_message = "No face ready for enrollment"
            return response

        if self.ready_embedding is None or self.ready_thumbnail is None:
            response.error_message = "Embedding or thumbnail not available"
            return response

        person_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + "Z"

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO persons "
                "(id, name, embedding, thumbnail, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    person_id,
                    request.name.strip(),
                    self.ready_embedding.tobytes(),
                    self.ready_thumbnail,
                    created_at,
                ),
            )
            conn.commit()
            conn.close()

            response.success = True
            response.person_id = person_id

            self.current_status = self.STATUS_IDLE
            self._reset_scan()

            self.get_logger().info(f"Added person: {request.name} ({person_id})")

        except Exception as e:
            response.error_message = f"Database error: {str(e)}"
            self.get_logger().error(f"Failed to add person: {e}")

        return response

    def _remove_person_callback(self, request, response):
        """Handle RemovePerson service request."""
        response.success = False
        response.error_message = ""

        if not request.person_id:
            response.error_message = "Person ID is required"
            return response

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "SELECT name FROM persons WHERE id = ?", (request.person_id,)
            )
            row = cursor.fetchone()

            if row is None:
                response.error_message = "Person not found"
                conn.close()
                return response

            person_name = row[0]

            cursor.execute(
                "UPDATE tracking_target SET person_id = NULL WHERE person_id = ?",
                (request.person_id,),
            )

            cursor.execute("DELETE FROM persons WHERE id = ?", (request.person_id,))
            conn.commit()
            conn.close()

            response.success = True
            self.get_logger().info(
                f"Removed person: {person_name} ({request.person_id})"
            )

        except Exception as e:
            response.error_message = f"Database error: {str(e)}"
            self.get_logger().error(f"Failed to remove person: {e}")

        return response

    def _list_persons_callback(self, request, response):
        """Handle ListPersons service request."""
        response.persons = []

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, thumbnail, created_at "
                "FROM persons ORDER BY created_at DESC"
            )
            rows = cursor.fetchall()
            conn.close()

            for row in rows:
                person = EnrolledPerson()
                person.person_id = row[0]
                person.name = row[1]
                person.thumbnail_base64 = base64.b64encode(row[2]).decode("utf-8")
                person.created_at = row[3]
                response.persons.append(person)

        except Exception as e:
            self.get_logger().error(f"Failed to list persons: {e}")

        return response

    def _set_target_callback(self, request, response):
        """Handle SetTrackingTarget service request."""
        response.success = False
        response.error_message = ""

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if not request.person_id:
                cursor.execute(
                    "UPDATE tracking_target SET person_id = NULL WHERE id = 1"
                )
                conn.commit()
                conn.close()
                response.success = True
                self.get_logger().info("Cleared tracking target")
                return response

            cursor.execute("SELECT id FROM persons WHERE id = ?", (request.person_id,))
            if cursor.fetchone() is None:
                response.error_message = "Person not found"
                conn.close()
                return response

            cursor.execute(
                "UPDATE tracking_target SET person_id = ? WHERE id = 1",
                (request.person_id,),
            )
            conn.commit()
            conn.close()

            response.success = True
            self.get_logger().info(f"Set tracking target: {request.person_id}")

        except Exception as e:
            response.error_message = f"Database error: {str(e)}"
            self.get_logger().error(f"Failed to set target: {e}")

        return response

    def _get_target_callback(self, request, response):
        """Handle GetTrackingTarget service request."""
        response.person_id = ""
        response.person_name = ""

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.id, p.name
                FROM tracking_target t
                LEFT JOIN persons p ON t.person_id = p.id
                WHERE t.id = 1
            """)
            row = cursor.fetchone()
            conn.close()

            if row and row[0]:
                response.person_id = row[0]
                response.person_name = row[1] if row[1] else ""

        except Exception as e:
            self.get_logger().error(f"Failed to get target: {e}")

        return response


def main(args=None):
    rclpy.init(args=args)
    node = EnrollmentNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
