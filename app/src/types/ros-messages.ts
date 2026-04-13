/**
 * TypeScript types for ROS messages used in the dashboard.
 */

// ─────────────────────────────────────────────────────────────────────────────
// geometry_msgs
// ─────────────────────────────────────────────────────────────────────────────

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

export interface Point {
    x: number;
    y: number;
    z: number;
}

export interface Pose {
    position: Point;
    orientation: Quaternion;
}

export interface PoseWithCovariance {
    pose: Pose;
    covariance: number[]; // float64[36]
}

export interface Twist {
    linear: Vector3;
    angular: Vector3;
}

export interface PoseStamped {
    header: Header;
    pose: Pose;
}

export interface PoseWithCovarianceStamped {
    header: Header;
    pose: PoseWithCovariance;
}

export interface PoseArray {
    header: Header;
    poses: Pose[];
}

// ─────────────────────────────────────────────────────────────────────────────
// std_msgs
// ─────────────────────────────────────────────────────────────────────────────

export interface Header {
    stamp: Time;
    frame_id: string;
}

export interface Time {
    sec: number;
    nanosec: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// sensor_msgs
// ─────────────────────────────────────────────────────────────────────────────

export interface CompressedImage {
    header: Header;
    format: string; // e.g., 'jpeg', 'png'
    data: string; // base64 encoded image data
}

export interface LaserScan {
    header: Header;
    angle_min: number;
    angle_max: number;
    angle_increment: number;
    time_increment: number;
    scan_time: number;
    range_min: number;
    range_max: number;
    ranges: number[];
    intensities: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// nav_msgs
// ─────────────────────────────────────────────────────────────────────────────

export interface MapMetaData {
    map_load_time: Time;
    resolution: number; // meters per cell
    width: number; // cells
    height: number; // cells
    origin: Pose;
}

export interface OccupancyGrid {
    header: Header;
    info: MapMetaData;
    data: number[]; // int8[] - 0-100 occupancy, -1 unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// tf2_msgs
// ─────────────────────────────────────────────────────────────────────────────

export interface TransformStamped {
    header: Header;
    child_frame_id: string;
    transform: {
        translation: Vector3;
        rotation: Quaternion;
    };
}

export interface TFMessage {
    transforms: TransformStamped[];
}

// ─────────────────────────────────────────────────────────────────────────────
// nav2_msgs actions
// ─────────────────────────────────────────────────────────────────────────────

export interface NavigateToPoseGoal {
    pose: PoseStamped;
    behavior_tree?: string;
}

export interface NavigateToPoseFeedback {
    current_pose: PoseStamped;
    navigation_time: { sec: number; nanosec: number };
    estimated_time_remaining: { sec: number; nanosec: number };
    number_of_recoveries: number;
    distance_remaining: number;
}

export type NavigateToPoseResult = Record<string, never>;

// ─────────────────────────────────────────────────────────────────────────────
// explore_lite action
// ─────────────────────────────────────────────────────────────────────────────

export type ExploreGoal = Record<string, never>;

export type ExploreFeedback = Record<string, never>;

export type ExploreResult = Record<string, never>;

// ─────────────────────────────────────────────────────────────────────────────
// slam_toolbox services
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveMapRequest {
    name: { data: string };
}

export interface SaveMapResponse {
    result: number; // 0 = success
}

// ─────────────────────────────────────────────────────────────────────────────
// rcl_interfaces for parameter setting
// ─────────────────────────────────────────────────────────────────────────────

export interface ParameterValue {
    type: number; // 1=bool, 2=int, 3=double, 4=string, 5=byte_array, 6=bool_array, 7=int_array, 8=double_array, 9=string_array
    bool_value?: boolean;
    integer_value?: number;
    double_value?: number;
    string_value?: string;
}

export interface Parameter {
    name: string;
    value: ParameterValue;
}

export interface SetParametersRequest {
    parameters: Parameter[];
}

export interface SetParametersResult {
    successful: boolean;
    reason: string;
}

export interface SetParametersResponse {
    results: SetParametersResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// slam_car_interfaces services (map management)
// ─────────────────────────────────────────────────────────────────────────────

// ListMaps service
export type ListMapsRequest = Record<string, never>;

export interface ListMapsResponse {
    maps: string[];
    success: boolean;
    message: string;
}

// LoadMap service
export interface LoadMapRequest {
    map_name: string;
}

export interface LoadMapResponse {
    success: boolean;
    message: string;
}

// SetMode service
export interface SetModeRequest {
    mode: number; // RobotMode: 0=IDLE, 1=FACE_TRACKING, 2=SLAM_MAPPING, 3=NAVIGATION, 4=MANUAL
}

export interface SetModeResponse {
    success: boolean;
    message: string;
    previous_mode: number;
    current_mode: number;
}

// RobotMode constants
export const RobotMode = {
    IDLE: 0,
    FACE_TRACKING: 1,
    SLAM_MAPPING: 2,
    NAVIGATION: 3,
    MANUAL: 4,
} as const;

export type RobotModeType = (typeof RobotMode)[keyof typeof RobotMode];
