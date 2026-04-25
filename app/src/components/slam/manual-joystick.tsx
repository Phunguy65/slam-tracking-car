/**
 * Manual joystick component for teleop control.
 *
 * Supports both mouse/touch drag and keyboard arrow keys.
 * Designed as a standalone HUD element with glassmorphic styling.
 */
'use client';

import type { IJoystickChangeValue } from 'rc-joystick';
import Joystick from 'rc-joystick';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePublisher } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { Twist } from '@/types/ros-messages.ts';

const MAX_LINEAR = 0.3;
const MAX_ANGULAR = 1.0;

const JOYSTICK_BASE_RADIUS = 90;
const JOYSTICK_CONTROLLER_RADIUS = 35;
const JOYSTICK_OUTER_RADIUS = JOYSTICK_BASE_RADIUS - JOYSTICK_CONTROLLER_RADIUS;

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
    const containerRef = useRef<HTMLDivElement | null>(null);
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

    useEffect(() => {
        return () => {
            if (publishIntervalRef.current) {
                clearInterval(publishIntervalRef.current);
                publishIntervalRef.current = null;
            }
            publishCmdVel({
                linear: { x: 0, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: 0 },
            });
        };
    }, [publishCmdVel]);

    const handleStop = useCallback(() => {
        if (publishIntervalRef.current) {
            clearInterval(publishIntervalRef.current);
            publishIntervalRef.current = null;
        }

        const zeroVelocity: Twist = {
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        };
        lastVelocityRef.current = zeroVelocity;
        publishCmdVel(zeroVelocity);
    }, [publishCmdVel]);

    const handleChange = useCallback(
        (event: IJoystickChangeValue) => {
            if (event.angle === undefined || event.distance === 0) return;

            const angleRad = (event.angle * Math.PI) / 180;
            const normalized = event.distance / JOYSTICK_OUTER_RADIUS;
            const clampedNorm = Math.min(normalized, 1);

            const linear_x = Math.sin(angleRad) * clampedNorm * MAX_LINEAR;
            const angular_z = -Math.cos(angleRad) * clampedNorm * MAX_ANGULAR;

            lastVelocityRef.current = {
                linear: { x: linear_x, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: angular_z },
            };

            if (!publishIntervalRef.current) {
                publishIntervalRef.current = setInterval(() => {
                    publishCmdVel(lastVelocityRef.current);
                }, 100);
            }
        },
        [publishCmdVel],
    );

    const handleActiveChange = useCallback(
        (active: boolean) => {
            if (!active) {
                handleStop();
            }
        },
        [handleStop],
    );

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

    useEffect(() => {
        if (status !== 'connected') return;

        if (activeKeys.size === 0) {
            handleStop();
            return;
        }

        let linear_x = 0;
        let angular_z = 0;

        if (activeKeys.has('ArrowUp')) linear_x += MAX_LINEAR;
        if (activeKeys.has('ArrowDown')) linear_x -= MAX_LINEAR;
        if (activeKeys.has('ArrowLeft')) angular_z += MAX_ANGULAR;
        if (activeKeys.has('ArrowRight')) angular_z -= MAX_ANGULAR;

        lastVelocityRef.current = {
            linear: { x: linear_x, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: angular_z },
        };

        if (!publishIntervalRef.current) {
            publishIntervalRef.current = setInterval(() => {
                publishCmdVel(lastVelocityRef.current);
            }, 100);
        }
    }, [activeKeys, status, handleStop, publishCmdVel]);

    const isDisabled = status !== 'connected';

    const focusContainer = useCallback(() => {
        containerRef.current?.focus({ preventScroll: true });
    }, []);

    return (
        <div
            ref={containerRef}
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
            onPointerDown={() => {
                focusContainer();
            }}
            onBlur={(e) => {
                if (containerRef.current?.contains(e.relatedTarget as Node))
                    return;
                setActiveKeys(new Set());
                handleStop();
            }}
            tabIndex={isDisabled ? -1 : 0}
            role='application'
            aria-label='Manual robot control. Use arrow keys or drag joystick to drive.'
        >
            <Joystick
                baseRadius={JOYSTICK_BASE_RADIUS}
                controllerRadius={JOYSTICK_CONTROLLER_RADIUS}
                onChange={handleChange}
                onActiveChange={handleActiveChange}
                throttle={100}
                disabled={isDisabled}
                autoReset
                className='manual-joystick-base'
                controllerClassName='manual-joystick-controller'
            />
            {showLabel && (
                <p className='text-xs text-muted-foreground text-center'>
                    Drag or use arrow keys
                </p>
            )}
        </div>
    );
}
