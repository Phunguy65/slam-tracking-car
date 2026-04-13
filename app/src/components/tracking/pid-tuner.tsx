/**
 * PID Tuner component with debounced sliders.
 *
 * Allows live tuning of face tracking PID parameters.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider.tsx';
import { useSetParameters } from '@/hooks/use-service.ts';
import { useRosStore } from '@/stores/ros-store.ts';

interface PidParams {
    yaw_kp: number;
    yaw_ki: number;
    yaw_kd: number;
    linear_kp: number;
    linear_ki: number;
    linear_kd: number;
}

const DEFAULT_PARAMS: PidParams = {
    yaw_kp: 0.3,
    yaw_ki: 0.0,
    yaw_kd: 0.05,
    linear_kp: 0.2,
    linear_ki: 0.0,
    linear_kd: 0.05,
};

const PARAM_CONFIG = [
    {
        key: 'yaw_kp',
        label: 'Yaw Kp',
        min: 0,
        max: 2,
        step: 0.01,
        param: 'pid_yaw_kp',
    },
    {
        key: 'yaw_ki',
        label: 'Yaw Ki',
        min: 0,
        max: 0.5,
        step: 0.001,
        param: 'pid_yaw_ki',
    },
    {
        key: 'yaw_kd',
        label: 'Yaw Kd',
        min: 0,
        max: 0.5,
        step: 0.01,
        param: 'pid_yaw_kd',
    },
    {
        key: 'linear_kp',
        label: 'Linear Kp',
        min: 0,
        max: 1,
        step: 0.01,
        param: 'pid_linear_kp',
    },
    {
        key: 'linear_ki',
        label: 'Linear Ki',
        min: 0,
        max: 0.5,
        step: 0.001,
        param: 'pid_linear_ki',
    },
    {
        key: 'linear_kd',
        label: 'Linear Kd',
        min: 0,
        max: 0.5,
        step: 0.01,
        param: 'pid_linear_kd',
    },
] as const;

const DEBOUNCE_MS = 300;

export function PidTuner() {
    const [params, setParams] = useState<PidParams>(DEFAULT_PARAMS);
    const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(
        new Set(),
    );
    const status = useRosStore((s) => s.status);
    const { setParameter } = useSetParameters('face_follow_controller');
    const debounceTimers = useRef<
        Record<string, ReturnType<typeof setTimeout>>
    >({});

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(clearTimeout);
        };
    }, []);

    const handleChange = useCallback(
        (key: keyof PidParams, paramName: string, value: number) => {
            // Update local state immediately
            setParams((prev) => ({ ...prev, [key]: value }));

            // Mark as pending
            setPendingUpdates((prev) => new Set([...prev, key]));

            // Clear existing timer for this param
            if (debounceTimers.current[key]) {
                clearTimeout(debounceTimers.current[key]);
            }

            // Debounce the service call
            debounceTimers.current[key] = setTimeout(async () => {
                try {
                    await setParameter(paramName, value);
                    console.log(`[PidTuner] Updated ${paramName} = ${value}`);
                } catch (err) {
                    console.error(
                        `[PidTuner] Failed to update ${paramName}:`,
                        err,
                    );
                } finally {
                    setPendingUpdates((prev) => {
                        const next = new Set(prev);
                        next.delete(key);
                        return next;
                    });
                }
            }, DEBOUNCE_MS);
        },
        [setParameter],
    );

    const isDisabled = status !== 'connected';

    return (
        <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
                {PARAM_CONFIG.map(({ key, label, min, max, step, param }) => (
                    <div key={key} className='space-y-1.5'>
                        <div className='flex items-center justify-between'>
                            <span className='text-xs text-muted-foreground'>
                                {label}
                            </span>
                            <span className='font-data text-xs'>
                                {params[key].toFixed(3)}
                                {pendingUpdates.has(key) && (
                                    <span className='ml-1 text-primary'>
                                        ...
                                    </span>
                                )}
                            </span>
                        </div>
                        <Slider
                            value={[params[key]]}
                            min={min}
                            max={max}
                            step={step}
                            onValueChange={([v]) => handleChange(key, param, v)}
                            disabled={isDisabled}
                            className='w-full'
                        />
                    </div>
                ))}
            </div>

            <p className='text-xs text-muted-foreground text-center'>
                Changes apply in real-time via ROS parameters
            </p>
        </div>
    );
}
