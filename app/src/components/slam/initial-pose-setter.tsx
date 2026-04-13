/**
 * Initial pose setter component.
 *
 * Publishes to /initialpose for AMCL localization.
 * Cleaner UX with direct action buttons instead of toggle state.
 */
'use client';

import { Crosshair, Home } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { usePublisher } from '@/hooks/use-topic.ts';
import { yawToQuaternion } from '@/lib/tf-listener.ts';
import { cn } from '@/lib/utils.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { PoseWithCovarianceStamped } from '@/types/ros-messages.ts';

interface InitialPoseSetterProps {
    /** Additional className */
    className?: string;
    /** Compact mode - single row of buttons */
    compact?: boolean;
}

export function InitialPoseSetter({
    className,
    compact = false,
}: InitialPoseSetterProps) {
    const status = useRosStore((s) => s.status);
    const isDisabled = status !== 'connected';

    const publishInitialPose = usePublisher<PoseWithCovarianceStamped>(
        '/initialpose',
        'geometry_msgs/PoseWithCovarianceStamped',
    );

    const setInitialPose = useCallback(
        (x: number, y: number, yaw: number) => {
            const pose: PoseWithCovarianceStamped = {
                header: {
                    stamp: { sec: 0, nanosec: 0 },
                    frame_id: 'map',
                },
                pose: {
                    pose: {
                        position: { x, y, z: 0 },
                        orientation: yawToQuaternion(yaw),
                    },
                    covariance: [
                        0.25, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0.068,
                    ],
                },
            };
            publishInitialPose(pose);
        },
        [publishInitialPose],
    );

    const handleSetOrigin = useCallback(() => {
        setInitialPose(0, 0, 0);
    }, [setInitialPose]);

    if (compact) {
        return (
            <div className={cn('flex gap-2', className)}>
                <Button
                    onClick={handleSetOrigin}
                    disabled={isDisabled}
                    variant='secondary'
                    size='sm'
                    className='flex-1 gap-1.5'
                    title='Set robot position at map origin (0, 0)'
                >
                    <Home className='size-3.5' />
                    <span>Origin</span>
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('space-y-3', className)}>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Crosshair className='size-4' />
                <span>Set robot position for localization</span>
            </div>

            <div className='flex gap-2'>
                <Button
                    onClick={handleSetOrigin}
                    disabled={isDisabled}
                    variant='secondary'
                    size='sm'
                    className='flex-1 gap-1.5'
                >
                    <Home className='size-3.5' />
                    <span>Set at Origin</span>
                </Button>
            </div>

            <p className='text-xs text-muted-foreground'>
                Click on map to set custom position (in navigation mode)
            </p>
        </div>
    );
}
