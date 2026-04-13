/**
 * TF (transform) listener utilities.
 *
 * Provides functions to extract robot pose from TF messages.
 */

import type {
    Pose,
    TFMessage,
    TransformStamped,
} from '@/types/ros-messages.ts';

/**
 * Find a transform between two frames in a TF message.
 */
export function findTransform(
    msg: TFMessage,
    parentFrame: string,
    childFrame: string,
): TransformStamped | null {
    return (
        msg.transforms.find(
            (t) =>
                t.header.frame_id === parentFrame
                && t.child_frame_id === childFrame,
        ) ?? null
    );
}

/**
 * Convert a quaternion to yaw angle (rotation around Z axis).
 */
export function quaternionToYaw(q: {
    x: number;
    y: number;
    z: number;
    w: number;
}): number {
    // yaw = atan2(2*(qw*qz + qx*qy), 1 - 2*(qy^2 + qz^2))
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    return Math.atan2(siny_cosp, cosy_cosp);
}

/**
 * Convert a transform to a Pose.
 */
export function transformToPose(transform: TransformStamped): Pose {
    return {
        position: {
            x: transform.transform.translation.x,
            y: transform.transform.translation.y,
            z: transform.transform.translation.z,
        },
        orientation: transform.transform.rotation,
    };
}

/**
 * Create a Pose from x, y position and yaw angle.
 */
export function createPose(x: number, y: number, yaw: number): Pose {
    return {
        position: { x, y, z: 0 },
        orientation: yawToQuaternion(yaw),
    };
}

/**
 * Convert yaw angle to quaternion.
 */
export function yawToQuaternion(yaw: number): {
    x: number;
    y: number;
    z: number;
    w: number;
} {
    const halfYaw = yaw / 2;
    return {
        x: 0,
        y: 0,
        z: Math.sin(halfYaw),
        w: Math.cos(halfYaw),
    };
}
