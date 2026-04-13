/**
 * Tracking status component showing detection info.
 */
'use client';

import { useCallback, useState } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import type { PoseArray } from '@/types/ros-messages.ts';

export function TrackingStatus() {
    const [faceCount, setFaceCount] = useState(0);
    const [primaryFace, setPrimaryFace] = useState<{
        x: number;
        y: number;
        size: number;
    } | null>(null);

    const handleDetections = useCallback((msg: PoseArray) => {
        setFaceCount(msg.poses.length);

        if (msg.poses.length > 0) {
            // Find the largest face (primary target)
            const largest = msg.poses.reduce((best, pose) =>
                pose.position.z > best.position.z ? pose : best,
            );
            setPrimaryFace({
                x: largest.position.x,
                y: largest.position.y,
                size: largest.position.z,
            });
        } else {
            setPrimaryFace(null);
        }
    }, []);

    useTopic<PoseArray>(
        '/face_detections',
        'geometry_msgs/PoseArray',
        handleDetections,
    );

    return (
        <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
                <span className='text-muted-foreground'>Faces Detected</span>
                <span className='font-data font-medium'>{faceCount}</span>
            </div>

            {primaryFace && (
                <>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                            Target Position
                        </span>
                        <span className='font-data font-medium'>
                            ({(primaryFace.x * 100).toFixed(0)}%,{' '}
                            {(primaryFace.y * 100).toFixed(0)}%)
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                            Target Size
                        </span>
                        <span className='font-data font-medium'>
                            {(primaryFace.size * 100).toFixed(1)}%
                        </span>
                    </div>
                </>
            )}

            {!primaryFace && (
                <div className='text-center text-muted-foreground py-2'>
                    No faces detected
                </div>
            )}
        </div>
    );
}
