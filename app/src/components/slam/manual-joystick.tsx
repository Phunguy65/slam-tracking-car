/**
 * Manual joystick component for teleop control.
 *
 * Supports both mouse/touch drag and keyboard arrow keys.
 * Designed as a standalone HUD element with glassmorphic styling.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Joystick } from 'react-joystick-component';
import { usePublisher } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { Twist } from '@/types/ros-messages.ts';

// Speed limits
const MAX_LINEAR = 0.3; // m/s
const MAX_ANGULAR = 1.0; // rad/s

// Joystick size (upgraded from 150px)
const JOYSTICK_SIZE = 180;

interface JoystickEvent {
    type: 'move' | 'stop' | 'start';
    x: number | null;
    y: number | null;
    direction: string | null;
}

interface ManualJoystickProps {
    /** Whether to show label */
    showLabel?: boolean;
    /** Additional className */
    className?: string;
}

export function ManualJoystick({
    showLabel = true,
    className,
}: ManualJoystickProps) {
    const status = useRosStore((s) => s.status);
    const publishCmdVel = usePublisher<Twist>(
        '/cmd_vel',
        'geometry_msgs/Twist',
    );
    const publishIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const lastVelocityRef = useRef<Twist>({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 },
    });
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    // Cleanup interval on unmount to prevent robot continuing to move
    useEffect(() => {
        return () => {
            if (publishIntervalRef.current) {
                clearInterval(publishIntervalRef.current);
                publishIntervalRef.current = null;
            }
            // Send zero velocity on unmount
            publishCmdVel({
                linear: { x: 0, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: 0 },
            });
        };
    }, [publishCmdVel]);

    const handleMove = useCallback(
        (event: JoystickEvent) => {
            if (event.x === null || event.y === null) return;

            // Convert joystick position to velocity
            // Joystick y is forward/backward, x is left/right rotation
            // Scale factor adjusted for new size (90 is half of 180)
            const linear_x = (event.y / 90) * MAX_LINEAR;
            const angular_z = -(event.x / 90) * MAX_ANGULAR;

            lastVelocityRef.current = {
                linear: { x: linear_x, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: angular_z },
            };

            // Start publishing at 10 Hz if not already
            if (!publishIntervalRef.current) {
                publishIntervalRef.current = setInterval(() => {
                    publishCmdVel(lastVelocityRef.current);
                }, 100);
            }
        },
        [publishCmdVel],
    );

    const handleStop = useCallback(() => {
        // Stop publishing interval
        if (publishIntervalRef.current) {
            clearInterval(publishIntervalRef.current);
            publishIntervalRef.current = null;
        }

        // Send zero velocity
        const zeroVelocity: Twist = {
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        };
        lastVelocityRef.current = zeroVelocity;
        publishCmdVel(zeroVelocity);
    }, [publishCmdVel]);

    // Keyboard control support
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!arrowKeys.includes(e.key)) return;

        e.preventDefault();
        setActiveKeys((prev) => new Set([...prev, e.key]));
    }, []);

    const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!arrowKeys.includes(e.key)) return;

        e.preventDefault();
        setActiveKeys((prev) => {
            const next = new Set(prev);
            next.delete(e.key);
            return next;
        });
    }, []);

    // Process active keys into velocity
    useEffect(() => {
        if (status !== 'connected') return;

        if (activeKeys.size === 0) {
            handleStop();
            return;
        }

        let x = 0;
        let y = 0;

        // Scale for new joystick size
        if (activeKeys.has('ArrowUp')) y = 90;
        if (activeKeys.has('ArrowDown')) y = -90;
        if (activeKeys.has('ArrowLeft')) x = -90;
        if (activeKeys.has('ArrowRight')) x = 90;

        handleMove({ type: 'move', x, y, direction: null });
    }, [activeKeys, status, handleMove, handleStop]);

    const isDisabled = status !== 'connected';

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-2',
                'p-3 rounded-xl',
                'bg-background/70 backdrop-blur-md',
                'border border-border/40 shadow-xl',
                isDisabled && 'opacity-50 pointer-events-none',
                className,
            )}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBlur={() => {
                setActiveKeys(new Set());
                handleStop();
            }}
            tabIndex={isDisabled ? -1 : 0}
            role='application'
            aria-label='Manual robot control. Use arrow keys or drag joystick to drive.'
        >
            <Joystick
                size={JOYSTICK_SIZE}
                baseColor='rgba(30, 35, 50, 0.8)'
                stickColor='hsl(var(--primary))'
                move={handleMove}
                stop={handleStop}
                throttle={100}
            />
            {showLabel && (
                <p className='text-xs text-muted-foreground text-center'>
                    Drag or use arrow keys
                </p>
            )}
        </div>
    );
}
