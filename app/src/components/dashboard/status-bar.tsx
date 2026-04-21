/**
 * Status bar component for persistent telemetry display.
 *
 * Shows battery, signal, frame rate, pose, and ROS errors.
 */
'use client';

import { AlertCircle, Battery, Signal, Timer, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { BatteryState, Odometry } from '@/types/ros-messages.ts';

export function StatusBar() {
    const status = useRosStore((s) => s.status);
    const rosError = useDashboardStore((s) => s.rosError);
    const clearRosError = useDashboardStore((s) => s.clearRosError);

    const [battery, setBattery] = useState<number | null>(null);
    const [fps, setFps] = useState<number>(0);
    const [pose, setPose] = useState<{ x: number; y: number } | null>(null);

    const frameCountRef = useRef(0);
    const lastFpsTimeRef = useRef(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastFpsTimeRef.current) / 1000;
            setFps(Math.round(frameCountRef.current / elapsed));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleBattery = useCallback((msg: BatteryState) => {
        setBattery(Math.round(msg.percentage * 100));
    }, []);

    useTopic<BatteryState>(
        '/battery_state',
        'sensor_msgs/BatteryState',
        handleBattery,
        { throttleRate: 5000 },
    );

    const handleOdom = useCallback((msg: Odometry) => {
        frameCountRef.current++;
        setPose({
            x: msg.pose.pose.position.x,
            y: msg.pose.pose.position.y,
        });
    }, []);

    useTopic<Odometry>('/odom', 'nav_msgs/Odometry', handleOdom, {
        throttleRate: 100,
    });

    const isConnected = status === 'connected';

    return (
        <div
            className={cn(
                'flex items-center justify-between px-4 py-2',
                'bg-background/80 backdrop-blur-sm border-t border-border/40',
            )}
            role='status'
            aria-label='System status bar'
        >
            <div className='flex items-center gap-4 text-xs'>
                <StatusItem
                    icon={<Signal className='size-3.5' />}
                    label='Status'
                    value={isConnected ? 'Connected' : status}
                    variant={isConnected ? 'success' : 'warning'}
                />

                {battery !== null && (
                    <StatusItem
                        icon={<Battery className='size-3.5' />}
                        label='Battery'
                        value={`${battery}%`}
                        variant={battery > 20 ? 'default' : 'warning'}
                    />
                )}

                <StatusItem
                    icon={<Timer className='size-3.5' />}
                    label='Rate'
                    value={`${fps} Hz`}
                    variant='default'
                />

                {pose && (
                    <StatusItem
                        icon={null}
                        label='Pose'
                        value={`(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)})`}
                        variant='default'
                    />
                )}
            </div>

            {rosError && (
                <div
                    className={cn(
                        'flex items-center gap-2 px-3 py-1 rounded-md',
                        'bg-destructive/20 text-destructive text-xs',
                    )}
                    role='alert'
                >
                    <AlertCircle className='size-3.5' />
                    <span>{rosError}</span>
                    <button
                        type='button'
                        onClick={clearRosError}
                        className='p-0.5 hover:bg-destructive/20 rounded'
                        aria-label='Dismiss error'
                    >
                        <X className='size-3' />
                    </button>
                </div>
            )}

            <div className='text-xs text-muted-foreground'>
                <kbd className='px-1 py-0.5 rounded bg-muted font-mono'>
                    Space
                </kbd>
                {' E-Stop'}
            </div>
        </div>
    );
}

interface StatusItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    variant: 'default' | 'success' | 'warning';
}

function StatusItem({ icon, label, value, variant }: StatusItemProps) {
    const variantClasses = {
        default: 'text-muted-foreground',
        success: 'text-success',
        warning: 'text-warning',
    };

    return (
        <div className='flex items-center gap-1.5'>
            {icon && <span className={variantClasses[variant]}>{icon}</span>}
            <span className='text-muted-foreground'>{label}:</span>
            <span
                className={cn('font-data font-medium', variantClasses[variant])}
            >
                {value}
            </span>
        </div>
    );
}
