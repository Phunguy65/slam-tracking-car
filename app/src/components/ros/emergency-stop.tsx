/**
 * Emergency Stop button component.
 *
 * Always-visible button that stops all robot motion.
 * Also responds to Spacebar key.
 */
'use client';

import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { usePublisher } from '@/hooks/use-topic.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { Twist } from '@/types/ros-messages.ts';

export function EmergencyStop() {
    const status = useRosStore((s) => s.status);
    const publishCmdVel = usePublisher<Twist>(
        '/cmd_vel',
        'geometry_msgs/Twist',
    );

    const handleEmergencyStop = useCallback(() => {
        // Publish zero velocity
        publishCmdVel({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        });

        console.log('[EmergencyStop] Emergency stop triggered');

        // TODO: Cancel active actions (NavigateToPose, Explore)
        // This would require storing action refs globally or using a context
    }, [publishCmdVel]);

    // Handle spacebar keypress for emergency stop
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only trigger on spacebar, and not if user is typing in an input
            if (
                event.code === 'Space'
                && !['INPUT', 'TEXTAREA', 'SELECT'].includes(
                    (event.target as Element)?.tagName,
                )
            ) {
                event.preventDefault();
                handleEmergencyStop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleEmergencyStop]);

    return (
        <Button
            variant='destructive'
            size='lg'
            onClick={handleEmergencyStop}
            disabled={status !== 'connected'}
            className='font-bold uppercase tracking-wider'
            title='Emergency Stop (Spacebar)'
        >
            E-STOP
        </Button>
    );
}
