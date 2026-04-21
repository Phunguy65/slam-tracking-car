# Enrollment state machine status
# Status constants
uint8 IDLE = 0              # No face detected, waiting
uint8 FACE_DETECTED = 1     # Face detected, about to start scanning
uint8 SCANNING = 2          # Extracting face embedding
uint8 READY = 3             # Embedding extracted, ready to add person
uint8 NO_FACE = 4           # Face was lost during process

uint8 status                 # Current status (one of constants above)
slam_car_interfaces/BoundingBox2D face_bbox   # Face bounding box (valid when status != IDLE and != NO_FACE)
float32 scan_progress        # Progress 0.0-1.0 (only meaningful when status=SCANNING)
