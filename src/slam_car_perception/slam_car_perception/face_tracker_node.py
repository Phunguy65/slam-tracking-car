"""
Face detector node: detect faces in /camera/image_raw, publish detections.

Pure perception — publishes face bounding box data on /face_detections.
Does NOT publish /cmd_vel. A separate controller node handles motion.

Uses MediaPipe Face Detection (preferred) or OpenCV Haar cascade (fallback).
"""
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from geometry_msgs.msg import PoseArray, Pose
from cv_bridge import CvBridge
import cv2

try:
    import mediapipe as mp

    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False


class FaceTrackerNode(Node):
    def __init__(self):
        super().__init__("face_tracker_node")

        # Parameters
        self.declare_parameter("detection_method", "mediapipe")
        self.declare_parameter("min_detection_confidence", 0.5)
        self.declare_parameter("image_topic", "/camera/image_raw")

        # ROS interfaces
        self.bridge = CvBridge()
        image_topic = self.get_parameter("image_topic").value

        self.subscription = self.create_subscription(
            Image, image_topic, self._image_callback, 10
        )
        # Publish face detections as PoseArray:
        #   pose.position.x = normalized center X (0..1)
        #   pose.position.y = normalized center Y (0..1)
        #   pose.position.z = normalized face width (0..1, for distance estimation)
        self.detection_pub = self.create_publisher(
            PoseArray, "/face_detections", 10
        )

        # Face detector
        self.detection_method = self.get_parameter("detection_method").value
        self.face_detector = None

        if self.detection_method == "mediapipe" and HAS_MEDIAPIPE:
            self.mp_face = mp.solutions.face_detection
            self.face_detector = self.mp_face.FaceDetection(
                min_detection_confidence=self.get_parameter(
                    "min_detection_confidence"
                ).value
            )
            self.get_logger().info("Face detector started (MediaPipe)")
        else:
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            self.get_logger().info("Face detector started (OpenCV Haar)")

    def _image_callback(self, msg: Image):
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        h, w = frame.shape[:2]

        faces = self._detect_faces(frame)

        pose_array = PoseArray()
        pose_array.header = msg.header

        for (fx, fy, fw, fh) in faces:
            pose = Pose()
            pose.position.x = (fx + fw / 2.0) / w  # Normalized center X
            pose.position.y = (fy + fh / 2.0) / h  # Normalized center Y
            pose.position.z = fw / float(w)         # Normalized face width
            pose_array.poses.append(pose)

        self.detection_pub.publish(pose_array)

    def _detect_faces(self, frame):
        """Detect all faces. Returns list of (x, y, w, h)."""
        results = []

        if self.detection_method == "mediapipe" and self.face_detector:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            detections = self.face_detector.process(rgb)

            if detections.detections:
                h, w = frame.shape[:2]
                for det in detections.detections:
                    bbox = det.location_data.relative_bounding_box
                    bx = int(bbox.xmin * w)
                    by = int(bbox.ymin * h)
                    bw = int(bbox.width * w)
                    bh = int(bbox.height * h)
                    results.append((bx, by, bw, bh))
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            for (x, y, w, h) in faces:
                results.append((x, y, w, h))

        return results

    def destroy_node(self):
        if self.face_detector:
            self.face_detector.close()
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = FaceTrackerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
