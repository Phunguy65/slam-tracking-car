/**
 * Manual servo pan control component.
 *
 * Horizontal slider for manually positioning the pan servo left/right.
 * Only active when face tracking is disabled. Publishes to /servo_cmd
 * at 10 Hz during drag; holds position on release.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider.tsx';
import { usePublisher, useTopic } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { JointState } from '@/types/ros-messages.ts';

const PAN_JOINT_NAME = 'camera_pan_joint';
const SERVO_MIN = -Math.PI / 2;
const SERVO_MAX = Math.PI / 2;
const PUB_INTERVAL_MS = 100;

interface ServoPanControlProps {
    disabled?: boolean;
    className?: string;
}

export function ServoPanControl({
    disabled = false,
    className,
}: ServoPanControlProps) {
    const status = useRosStore((s) => s.status);
    const isConnected = status === 'connected';

    const [sliderValue, setSliderValue] = useState<number>(0);
    const [currentPosition, setCurrentPosition] = useState<number | null>(null);
    const lastPositionRef = useRef<number>(0);
    const publishIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

    const publishServoCmd = usePublisher<JointState>(
        '/servo_cmd',
        'sensor_msgs/JointState',
    );

    const stopPublishing = useCallback(() => {
        if (publishIntervalRef.current) {
            clearInterval(publishIntervalRef.current);
            publishIntervalRef.current = null;
        }
    }, []);

    const sendPosition = useCallback(
        (position: number) => {
            publishServoCmd({
                header: {
                    stamp: { sec: 0, nanosec: 0 },
                    frame_id: '',
                },
                name: [PAN_JOINT_NAME],
                position: [position],
            });
        },
        [publishServoCmd],
    );

    // Subscribe to /joint_states to display current pan position
    useTopic<JointState>(
        '/joint_states',
        'sensor_msgs/JointState',
        (msg) => {
            const idx = msg.name.indexOf(PAN_JOINT_NAME);
            if (idx !== -1 && msg.position[idx] !== undefined) {
                const pos = msg.position[idx];
                setCurrentPosition(pos);
                lastPositionRef.current = pos;
                // Sync slider to actual position when no drag is happening
                if (!publishIntervalRef.current) {
                    setSliderValue(pos);
                }
            }
        },
        { throttleRate: 200, enabled: isConnected && !disabled },
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPublishing();
        };
    }, [stopPublishing]);

    const handleValueChange = useCallback(
        (value: number | readonly number[]) => {
            const pos = Array.isArray(value) ? value[0] : value;
            setSliderValue(pos);
            lastPositionRef.current = pos;

            if (!publishIntervalRef.current) {
                sendPosition(pos);
                publishIntervalRef.current = setInterval(() => {
                    sendPosition(lastPositionRef.current);
                }, PUB_INTERVAL_MS);
            }
        },
        [sendPosition],
    );

    const handleValueCommit = useCallback(
        (value: number | readonly number[]) => {
            const pos = Array.isArray(value) ? value[0] : value;
            stopPublishing();
            lastPositionRef.current = pos;
            sendPosition(pos);
        },
        [stopPublishing, sendPosition],
    );

    const isDisabled = !isConnected || disabled;
    const displayPos = currentPosition ?? sliderValue;
    const displayDeg = ((displayPos * 180) / Math.PI).toFixed(1);

    return (
        <fieldset
            className={cn(
                'flex flex-col items-center gap-2',
                'px-4 py-3 rounded-xl',
                'bg-background/70 backdrop-blur-md',
                'border border-border/40 shadow-xl',
                'min-w-56',
                isDisabled && 'opacity-50 pointer-events-none',
                className,
            )}
            aria-label='Servo pan control'
        >
            <div className='flex items-center justify-between w-full'>
                <span className='text-xs text-muted-foreground font-medium'>
                    Pan Servo
                </span>
                <span className='text-xs tabular-nums font-mono text-muted-foreground'>
                    {displayDeg}&deg;
                </span>
            </div>

            <Slider
                className='w-full'
                value={[sliderValue]}
                onValueChange={handleValueChange}
                onValueCommitted={handleValueCommit}
                min={SERVO_MIN}
                max={SERVO_MAX}
                step={0.01}
                disabled={isDisabled}
            />

            <div className='flex items-center justify-between w-full'>
                <span className='text-[10px] text-muted-foreground/60'>
                    {-90}&deg;
                </span>
                <span className='text-[10px] text-muted-foreground/60'>
                    {90}&deg;
                </span>
            </div>
        </fieldset>
    );
}
