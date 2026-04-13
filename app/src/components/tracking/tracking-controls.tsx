/**
 * Tracking controls component with start/stop toggle.
 */
'use client';

import { useCallback, useState } from 'react';
import { Switch } from '@/components/ui/switch.tsx';
import { usePublisher } from '@/hooks/use-topic.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { Twist } from '@/types/ros-messages.ts';

export function TrackingControls() {
    const [isTracking, setIsTracking] = useState(false);
    const status = useRosStore((s) => s.status);
    const publishCmdVel = usePublisher<Twist>(
        '/cmd_vel',
        'geometry_msgs/Twist',
    );

    const handleToggle = useCallback(
        (enabled: boolean) => {
            setIsTracking(enabled);

            if (!enabled) {
                // Stop the robot when disabling tracking
                publishCmdVel({
                    linear: { x: 0, y: 0, z: 0 },
                    angular: { x: 0, y: 0, z: 0 },
                });
            }
        },
        [publishCmdVel],
    );

    return (
        <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
                <label
                    htmlFor='tracking-toggle'
                    className='text-sm font-medium'
                >
                    Face Tracking
                </label>
                <p className='text-xs text-muted-foreground'>
                    {isTracking
                        ? 'Robot following detected faces'
                        : 'Tracking disabled'}
                </p>
            </div>
            <Switch
                id='tracking-toggle'
                checked={isTracking}
                onCheckedChange={handleToggle}
                disabled={status !== 'connected'}
            />
        </div>
    );
}
