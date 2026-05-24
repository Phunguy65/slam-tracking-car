## 1. ROS2 Interfaces (slam_car_interfaces)

- [x] 1.1 Restore `msg/BoundingBox2D.msg` from commit `a87fe0ba5395`
- [x] 1.2 Restore `msg/EnrolledPerson.msg` from commit `a87fe0ba5395`
- [x] 1.3 Restore `msg/EnrollmentStatus.msg` from commit `a87fe0ba5395`
- [x] 1.4 Restore `msg/TrackedPerson.msg` from commit `a87fe0ba5395`, then add `float32 range_m` and `float32 bearing_rad` fields
- [x] 1.5 Restore `msg/TrackedPersonArray.msg` from commit `a87fe0ba5395`
- [x] 1.6 Restore `srv/AddPerson.srv`, `srv/RemovePerson.srv`, `srv/ListPersons.srv`, `srv/SetTrackingTarget.srv`, `srv/GetTrackingTarget.srv` from commit `a87fe0ba5395`
- [x] 1.7 Update `CMakeLists.txt` to register all 5 new msgs and 5 new srvs; add `geometry_msgs` and `sensor_msgs` to `DEPENDENCIES` ← (verify: `colcon build --packages-select slam_car_interfaces` succeeds and generated msgs include `range_m` + `bearing_rad`)

## 2. Camera Bridge (cam_bridge_node)

- [x] 2.1 Add ROS2 parameter `camera_fov_horizontal_deg` (default 62.0) to `cam_bridge_node`
- [x] 2.2 Compute intrinsic K from FOV: `cx=w/2`, `cy=h/2`, `fx=fy=w/(2·tan(FOV_h/2))` on first frame; cache
- [x] 2.3 Create publisher for `sensor_msgs/CameraInfo` on `/camera_info`
- [x] 2.4 Publish `CameraInfo` with the same `header.stamp` and `frame_id=camera_optical_frame` as each `/camera/image_raw` ← (verify: `ros2 topic echo /camera_info --once` shows valid K, D zeros, P populated)

## 3. Enrollment Node

- [x] 3.1 Cherry-pick `enrollment_node.py` (505 lines) from commit `a87fe0ba5395` into `src/slam_car_perception/slam_car_perception/`
- [x] 3.2 Verify SQLite path defaults to `~/.slam_car/face_db.sqlite`; create directory if missing on startup
- [x] 3.3 Verify services `/enrollment/add_person`, `/enrollment/remove_person`, `/enrollment/list_persons`, `/enrollment/set_target`, `/enrollment/get_target` are advertised
- [x] 3.4 Verify `/enrollment/status` (`EnrollmentStatus`) is published ← (verify: services match person-enrollment spec scenarios end-to-end)

## 4. Person Tracker Node — Skeleton

- [x] 4.1 Cherry-pick `person_tracker_node.py` skeleton from commit `a87fe0ba5395`
- [x] 4.2 Verify YOLOv8n + InsightFace lazy imports and load paths still work on current Docker image
- [x] 4.3 Verify SQLite hot-reload (1 Hz timer, `os.path.getmtime`) reloads embeddings within 1 s
- [x] 4.4 Verify IOU-based body-track matcher and confidence-decay logic (decay rate 0.1/s)

## 5. Person Tracker Node — Fusion (NEW)

- [x] 5.1 Add `slam_car_perception/leg_clusterer.py`: function `cluster_scan(ranges, angle_min, angle_increment)` returning list of clusters with `(centroid_range, centroid_angle, width)`. Filter by width ∈ [`leg_cluster_min_width_m`, `leg_cluster_max_width_m`] and range ∈ [0.3, 3.0].
- [x] 5.2 Add `slam_car_perception/leg_clusterer.py::pair_legs(clusters, min_gap, max_gap)` returning `(pair_centroid_range, pair_centroid_angle)` for clusters whose centroid gap is in `[leg_pair_min_gap_m, leg_pair_max_gap_m]`
- [x] 5.3 Add `slam_car_perception/bearing_transform.py`: class `BearingTransform` wrapping `tf2_ros.Buffer` + `TransformListener`, exposing `pixel_to_laser_bearing(u, image_width, K, stamp)` that computes `θ_cam = atan((u−cx)/fx)`, transforms unit vector `(sin θ_cam, 0, cos θ_cam)` from `camera_optical_frame` to `laser_link`, and returns the resulting 2D bearing in radians
- [x] 5.4 Subscribe `/scan`, `/joint_states`, `/camera_info` in `person_tracker_node`; cache latest K from `/camera_info`
- [x] 5.5 In `_image_callback`, for each body bbox: compute `bearing_rad` via `BearingTransform`; call `pair_legs` on the latest scan; pick the pair within `bearing_match_tolerance_rad`; set `range_m` (NaN if no match)
- [x] 5.6 Rate-limit warnings (max 1/s) for "no leg-pair match" and "TF lookup failed"
- [x] 5.7 Skip frame and warn if `/camera_info` has not been received yet ← (verify: `/tracked_persons` populates `range_m` with metric values when a person stands in front; logs no spam under normal operation)

## 6. Tracking Controller Node

- [x] 6.1 Cherry-pick `tracking_controller_node.py` skeleton from commit `a87fe0ba5395`
- [x] 6.2 Replace bbox-width linear-PID input with `range_m − target_distance_center` where `target_distance_center = (target_distance_min + target_distance_max) / 2`
- [x] 6.3 Treat `range_m=NaN` as "linear=0; servo + yaw still active"
- [x] 6.4 Subscribe `/scan`; implement `front_arc_clear(scan, min_dist=front_safety_distance, half_arc_rad=front_safety_half_arc_rad)`; gate `linear.x` to zero when not clear
- [x] 6.5 Add `/tracking_controller/status` publisher (`std_msgs/String`) at 5 Hz; payload = JSON `{state, target_id, range_m, obstacle}` (`null` for `range_m` when NaN)
- [x] 6.6 Verify search FSM (continue → scan → spin → idle) wiring is intact ← (verify: tracking-control spec scenarios for range, safety, status, search all hold)

## 7. Configuration & Launch

- [x] 7.1 Update `src/slam_car_bringup/config/person_tracker.yaml`:
  - Remove `target_body_width_min`, `target_body_width_max`, `body_width_too_far`, `body_width_too_close`
  - Add `target_distance_min: 1.0`, `target_distance_max: 1.5`, `distance_too_far: 2.5`, `distance_too_close: 0.6`
  - Add `front_safety_distance: 0.3`, `front_safety_half_arc_rad: 0.35`
  - Add `leg_cluster_min_width_m: 0.05`, `leg_cluster_max_width_m: 0.30`, `leg_pair_min_gap_m: 0.15`, `leg_pair_max_gap_m: 0.35`
  - Add `bearing_match_tolerance_rad: 0.10`
  - Add `camera_fov_horizontal_deg: 62.0` (under `cam_bridge_node` and `person_tracker_node`)
- [x] 7.2 Cherry-pick `src/slam_car_bringup/launch/person_tracking.launch.py` from commit `a87fe0ba5395`
- [x] 7.3 Verify the launch file passes `camera_fov_horizontal_deg` to `cam_bridge_node` and `person_tracker_node`
- [x] 7.4 Update `src/slam_car_perception/setup.py` `entry_points` to include `enrollment_node`, `person_tracker_node`, `tracking_controller_node`
- [x] 7.5 Update `src/slam_car_perception/package.xml` to depend on `tf2_ros`, `tf2_geometry_msgs`, `sensor_msgs`, `slam_car_interfaces` ← (verify: `ros2 launch slam_car_bringup person_tracking.launch.py` starts all three nodes without errors)

## 8. Tests

- [x] 8.1 Add `src/slam_car_perception/test/test_leg_clusterer.py`: unit tests for `cluster_scan` (synthetic ranges) and `pair_legs` (gap thresholds)
- [x] 8.2 Add `src/slam_car_perception/test/test_bearing_transform.py`: unit test for pixel→bearing math given fake K and identity TF
- [x] 8.3 Add `src/slam_car_perception/test/test_iou_matcher.py`: unit test for IOU bbox matching and confidence-decay timing
- [x] 8.4 Add `src/slam_car_perception/test/test_pid.py`: unit test for PID step response and clamp behaviour ← (verify: `pytest src/slam_car_perception/test/` passes)

## 9. Build & Smoke Test

- [x] 9.1 Build interfaces: `colcon build --packages-select slam_car_interfaces`
- [x] 9.2 Build perception + bringup: `colcon build --packages-select slam_car_perception slam_car_bringup`
- [x] 9.3 Source: `source install/setup.bash`
- [x] 9.4 Smoke test: `ros2 launch slam_car_bringup person_tracking.launch.py`
- [x] 9.5 Verify `ros2 topic echo /camera_info --once` returns valid K
- [x] 9.6 Verify `ros2 topic list` shows `/tracked_persons`, `/tracking_controller/status`, `/cmd_vel`, `/servo_cmd`
- [x] 9.7 Run pre-commit hooks (lefthook) on all touched files ← (verify: launch comes up clean, all expected topics appear, hooks pass)
