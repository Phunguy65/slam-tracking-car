/**
 * Tracking status component showing detection and target info.
 *
 * Subscribes to /tracked_persons for current tracking state.
 */
'use client';

import { useCallback, useState } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import type { TrackedPerson, TrackedPersonArray } from '@/types/enrollment.ts';

export function TrackingStatus() {
    const [personCount, setPersonCount] = useState(0);
    const [target, setTarget] = useState<TrackedPerson | null>(null);

    const handleTrackedPersons = useCallback((msg: TrackedPersonArray) => {
        setPersonCount(msg.persons.length);

        // Find target person
        const targetPerson = msg.persons.find((p) => p.is_target);
        setTarget(targetPerson || null);
    }, []);

    useTopic<TrackedPersonArray>(
        '/tracked_persons',
        'slam_car_interfaces/msg/TrackedPersonArray',
        handleTrackedPersons,
    );

    return (
        <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
                <span className='text-muted-foreground'>Persons Detected</span>
                <span className='font-data font-medium'>{personCount}</span>
            </div>

            {target && (
                <>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Target</span>
                        <span className='font-data font-medium'>
                            {target.person_id
                                ? target.person_id.slice(0, 8)
                                : 'Unknown'}
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                            Confidence
                        </span>
                        <span className='font-data font-medium'>
                            {target.confidence > 0
                                ? `${Math.round(target.confidence * 100)}%`
                                : 'N/A'}
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                            Target Position
                        </span>
                        <span className='font-data font-medium'>
                            ({(target.body_bbox.center_x * 100).toFixed(0)}%,{' '}
                            {(target.body_bbox.center_y * 100).toFixed(0)}%)
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Body Size</span>
                        <span className='font-data font-medium'>
                            {(target.body_bbox.width * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                            Face Visible
                        </span>
                        <span className='font-data font-medium'>
                            {target.face_visible ? 'Yes' : 'No'}
                        </span>
                    </div>
                </>
            )}

            {!target && personCount === 0 && (
                <div className='text-center text-muted-foreground py-2'>
                    No persons detected
                </div>
            )}

            {!target && personCount > 0 && (
                <div className='text-center text-muted-foreground py-2'>
                    Target not in frame
                </div>
            )}
        </div>
    );
}
