/**
 * TypeScript types for enrollment and person tracking messages.
 * Corresponds to slam_car_interfaces messages and services.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

/** Normalized 2D bounding box (all values 0.0-1.0) */
export interface BoundingBox2D {
    center_x: number;
    center_y: number;
    width: number;
    height: number;
}

/** Tracked person with detection and recognition info */
export interface TrackedPerson {
    person_id: string;
    confidence: number;
    is_target: boolean;
    body_bbox: BoundingBox2D;
    face_bbox: BoundingBox2D;
    face_visible: boolean;
    range_m: number;
    bearing_rad: number;
}

/** Tracking controller status parsed from std_msgs/String JSON. */
export interface TrackingControllerStatus {
    state: string;
    target_id: string;
    range_m: number | null;
    obstacle: boolean;
}

/** Array of tracked persons in current frame */
export interface TrackedPersonArray {
    header: { stamp: { sec: number; nanosec: number }; frame_id: string };
    persons: TrackedPerson[];
}

/** Enrolled person info from database */
export interface EnrolledPerson {
    person_id: string;
    name: string;
    thumbnail_base64: string;
    created_at: string;
}

/** Enrollment status from enrollment_node */
export interface EnrollmentStatus {
    status: EnrollmentStatusType;
    face_bbox: BoundingBox2D;
    scan_progress: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Constants
// ─────────────────────────────────────────────────────────────────────────────

export const EnrollmentStatusType = {
    IDLE: 0,
    FACE_DETECTED: 1,
    SCANNING: 2,
    READY: 3,
    NO_FACE: 4,
} as const;

export type EnrollmentStatusType =
    (typeof EnrollmentStatusType)[keyof typeof EnrollmentStatusType];

// ─────────────────────────────────────────────────────────────────────────────
// Service Types
// ─────────────────────────────────────────────────────────────────────────────

/** AddPerson service */
export interface AddPersonRequest {
    name: string;
}

export interface AddPersonResponse {
    success: boolean;
    person_id: string;
    error_message: string;
}

/** RemovePerson service */
export interface RemovePersonRequest {
    person_id: string;
}

export interface RemovePersonResponse {
    success: boolean;
    error_message: string;
}

/** ListPersons service */
export type ListPersonsRequest = Record<string, never>;

export interface ListPersonsResponse {
    persons: EnrolledPerson[];
}

/** SetTrackingTarget service */
export interface SetTrackingTargetRequest {
    person_id: string;
}

export interface SetTrackingTargetResponse {
    success: boolean;
    error_message: string;
}

/** GetTrackingTarget service */
export type GetTrackingTargetRequest = Record<string, never>;

export interface GetTrackingTargetResponse {
    person_id: string;
    person_name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function parseTrackingControllerStatus(
    jsonString: string,
): TrackingControllerStatus | null {
    try {
        const parsed = JSON.parse(
            jsonString,
        ) as Partial<TrackingControllerStatus>;

        if (
            typeof parsed.state !== 'string'
            || typeof parsed.target_id !== 'string'
            || typeof parsed.obstacle !== 'boolean'
            || !(parsed.range_m === null || typeof parsed.range_m === 'number')
        ) {
            return null;
        }

        return {
            state: parsed.state,
            target_id: parsed.target_id,
            range_m: parsed.range_m,
            obstacle: parsed.obstacle,
        };
    } catch {
        return null;
    }
}

/** Get human-readable status label */
export function getStatusLabel(status: EnrollmentStatusType): string {
    switch (status) {
        case EnrollmentStatusType.IDLE:
            return 'Waiting for face';
        case EnrollmentStatusType.FACE_DETECTED:
            return 'Face detected';
        case EnrollmentStatusType.SCANNING:
            return 'Scanning...';
        case EnrollmentStatusType.READY:
            return 'Ready to enroll';
        case EnrollmentStatusType.NO_FACE:
            return 'Face lost';
        default:
            return 'Unknown';
    }
}

/** Get status color class for Tailwind */
export function getStatusColor(status: EnrollmentStatusType): string {
    switch (status) {
        case EnrollmentStatusType.IDLE:
            return 'text-gray-400';
        case EnrollmentStatusType.FACE_DETECTED:
            return 'text-blue-400';
        case EnrollmentStatusType.SCANNING:
            return 'text-cyan-400';
        case EnrollmentStatusType.READY:
            return 'text-green-400';
        case EnrollmentStatusType.NO_FACE:
            return 'text-yellow-400';
        default:
            return 'text-gray-400';
    }
}
