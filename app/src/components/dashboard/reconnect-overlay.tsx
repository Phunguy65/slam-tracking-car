/**
 * Reconnect overlay for ROS connection loss during dashboard operation.
 *
 * Shows reconnecting status with retry affordance.
 */
'use client';

import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { reconnect } from '@/lib/ros-client/index.ts';
import { cn } from '@/lib/utils.ts';
import { useRosStore } from '@/stores/ros-store.ts';

export function ReconnectOverlay() {
    const status = useRosStore((s) => s.status);
    const error = useRosStore((s) => s.error);

    const handleRetry = useCallback(() => {
        reconnect();
    }, []);

    if (status === 'connected') {
        return null;
    }

    const isConnecting = status === 'connecting';
    const isError = status === 'error';

    return (
        <div
            className={cn(
                'absolute inset-0 z-40 flex flex-col items-center justify-center',
                'bg-background/80 backdrop-blur-sm',
            )}
            role='alertdialog'
            aria-labelledby='reconnect-title'
            aria-describedby='reconnect-description'
        >
            <div className='flex flex-col items-center text-center max-w-sm px-6'>
                {isConnecting ? (
                    <>
                        <Loader2 className='size-12 text-primary animate-spin mb-4' />
                        <h2
                            id='reconnect-title'
                            className='text-lg font-semibold mb-2'
                        >
                            Reconnecting...
                        </h2>
                        <p
                            id='reconnect-description'
                            className='text-sm text-muted-foreground'
                        >
                            Attempting to restore connection to the robot.
                        </p>
                    </>
                ) : (
                    <>
                        <WifiOff className='size-12 text-destructive/80 mb-4' />
                        <h2
                            id='reconnect-title'
                            className='text-lg font-semibold mb-2'
                        >
                            {isError ? 'Connection Error' : 'Disconnected'}
                        </h2>
                        <p
                            id='reconnect-description'
                            className='text-sm text-muted-foreground mb-4'
                        >
                            {error
                                ?? 'Lost connection to the robot. Check network and rosbridge.'}
                        </p>
                        <Button
                            onClick={handleRetry}
                            variant='default'
                            className='gap-2'
                        >
                            <RefreshCw className='size-4' />
                            Retry Connection
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
