'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider.tsx';
import { useSetParameters } from '@/hooks/use-service.ts';
import { useRosStore } from '@/stores/ros-store.ts';

interface PidParams {
    pid_servo_kp: number;
    pid_servo_ki: number;
    pid_servo_kd: number;
    pid_wheel_yaw_kp: number;
    pid_wheel_yaw_ki: number;
    pid_wheel_yaw_kd: number;
    pid_linear_kp: number;
    pid_linear_ki: number;
    pid_linear_kd: number;
}

type PidParamKey = keyof PidParams;

interface ParamConfig {
    key: PidParamKey;
    label: string;
    min: number;
    max: number;
    step: number;
}

interface ParamGroup {
    title: string;
    params: ParamConfig[];
}

const DEFAULT_PARAMS: PidParams = {
    pid_servo_kp: 2.0,
    pid_servo_ki: 0.0,
    pid_servo_kd: 0.1,
    pid_wheel_yaw_kp: 0.5,
    pid_wheel_yaw_ki: 0.0,
    pid_wheel_yaw_kd: 0.05,
    pid_linear_kp: 0.3,
    pid_linear_ki: 0.0,
    pid_linear_kd: 0.05,
};

const PARAM_GROUPS: ParamGroup[] = [
    {
        title: 'Servo',
        params: [
            {
                key: 'pid_servo_kp',
                label: 'Kp',
                min: 0,
                max: 5,
                step: 0.01,
            },
            {
                key: 'pid_servo_ki',
                label: 'Ki',
                min: 0,
                max: 0.5,
                step: 0.001,
            },
            {
                key: 'pid_servo_kd',
                label: 'Kd',
                min: 0,
                max: 1,
                step: 0.01,
            },
        ],
    },
    {
        title: 'Wheel Yaw',
        params: [
            {
                key: 'pid_wheel_yaw_kp',
                label: 'Kp',
                min: 0,
                max: 2,
                step: 0.01,
            },
            {
                key: 'pid_wheel_yaw_ki',
                label: 'Ki',
                min: 0,
                max: 0.5,
                step: 0.001,
            },
            {
                key: 'pid_wheel_yaw_kd',
                label: 'Kd',
                min: 0,
                max: 0.5,
                step: 0.01,
            },
        ],
    },
    {
        title: 'Linear',
        params: [
            {
                key: 'pid_linear_kp',
                label: 'Kp',
                min: 0,
                max: 1,
                step: 0.01,
            },
            {
                key: 'pid_linear_ki',
                label: 'Ki',
                min: 0,
                max: 0.5,
                step: 0.001,
            },
            {
                key: 'pid_linear_kd',
                label: 'Kd',
                min: 0,
                max: 0.5,
                step: 0.01,
            },
        ],
    },
];

const DEBOUNCE_MS = 300;

export function PidTuner() {
    const [params, setParams] = useState<PidParams>(DEFAULT_PARAMS);
    const [pendingUpdates, setPendingUpdates] = useState<Set<PidParamKey>>(
        new Set(),
    );
    const [errors, setErrors] = useState<Partial<Record<PidParamKey, string>>>(
        {},
    );
    const status = useRosStore((s) => s.status);
    const { setParameter } = useSetParameters('tracking_controller_node');
    const lastGoodParams = useRef<PidParams>(DEFAULT_PARAMS);
    const debounceTimers = useRef<
        Partial<Record<PidParamKey, ReturnType<typeof setTimeout>>>
    >({});

    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach((timer) => {
                if (timer) {
                    clearTimeout(timer);
                }
            });
        };
    }, []);

    const handleChange = useCallback(
        (key: PidParamKey, value: number) => {
            setParams((prev) => ({ ...prev, [key]: value }));
            setPendingUpdates((prev) => new Set([...prev, key]));
            setErrors((prev) => ({ ...prev, [key]: undefined }));

            const existingTimer = debounceTimers.current[key];
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            debounceTimers.current[key] = setTimeout(async () => {
                try {
                    await setParameter(key, value);
                    lastGoodParams.current = {
                        ...lastGoodParams.current,
                        [key]: value,
                    };
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'Failed to set parameter';
                    setParams((prev) => ({
                        ...prev,
                        [key]: lastGoodParams.current[key],
                    }));
                    setErrors((prev) => ({ ...prev, [key]: message }));
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
            {PARAM_GROUPS.map((group) => (
                <section key={group.title} className='space-y-3'>
                    <h4 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                        {group.title}
                    </h4>
                    <div className='grid gap-3'>
                        {group.params.map(({ key, label, min, max, step }) => (
                            <div key={key} className='space-y-1.5'>
                                <div className='flex items-center justify-between gap-3'>
                                    <span className='text-xs text-muted-foreground'>
                                        {label}
                                    </span>
                                    <div className='flex items-center gap-2'>
                                        {pendingUpdates.has(key) && (
                                            <span className='text-xs text-primary'>
                                                ...
                                            </span>
                                        )}
                                        <input
                                            type='number'
                                            value={params[key]}
                                            min={min}
                                            max={max}
                                            step={step}
                                            onChange={(event) => {
                                                const value = Number(
                                                    event.target.value,
                                                );
                                                if (Number.isFinite(value)) {
                                                    handleChange(key, value);
                                                }
                                            }}
                                            disabled={isDisabled}
                                            className='h-7 w-20 rounded border border-border bg-background px-2 text-right font-data text-xs'
                                        />
                                    </div>
                                </div>
                                <Slider
                                    value={[params[key]]}
                                    min={min}
                                    max={max}
                                    step={step}
                                    onValueChange={(value) => {
                                        const nextValue = Array.isArray(value)
                                            ? value[0]
                                            : value;
                                        if (typeof nextValue === 'number') {
                                            handleChange(key, nextValue);
                                        }
                                    }}
                                    disabled={isDisabled}
                                    className='w-full'
                                />
                                {errors[key] && (
                                    <p className='text-xs text-destructive'>
                                        {errors[key]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            <p className='text-xs text-muted-foreground text-center'>
                Changes apply in real-time via ROS parameters
            </p>
        </div>
    );
}
