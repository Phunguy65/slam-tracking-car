# A detected person with tracking information
string person_id              # UUID of enrolled person (empty if unknown)
float32 confidence            # Recognition confidence 0.0-1.0 (0.0 if unknown)
bool is_target                # True if this is the active tracking target
slam_car_interfaces/BoundingBox2D body_bbox   # Body bounding box (always present when person detected)
slam_car_interfaces/BoundingBox2D face_bbox   # Face bounding box (zeroed if not visible)
bool face_visible             # True if face is currently visible
