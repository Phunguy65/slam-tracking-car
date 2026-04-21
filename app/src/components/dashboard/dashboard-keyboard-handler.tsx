/**
 * Dashboard keyboard handler for shortcuts and accessibility.
 *
 * Manages emergency stop (Space), mode shortcuts (1/2), and arrow key
 * navigation while respecting editable field focus.
 */
'use client';

import { type ReactNode, useCallback, useEffect } from 'react';
import { usePublisher } from '@/hooks/use-topic.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { Twist } from '@/types/ros-messages.ts';

interface DashboardKeyboardHandlerProps {
    children: ReactNode;
}

const EDITABLE_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT'];
const ARROW_CONSUMING_ROLES = ['slider', 'spinbutton', 'listbox', 'menu'];

export function DashboardKeyboardHandler({
    children,
}: DashboardKeyboardHandlerProps) {
    const status = useRosStore((s) => s.status);
    const isConnected = status === 'connected';

    const primaryMode = useDashboardStore((s) => s.primaryMode);
    const slamSubmode = useDashboardStore((s) => s.slamSubmode);
    const autoExplore = useDashboardStore((s) => s.autoExplore);
    const manualOverride = useDashboardStore((s) => s.manualOverride);
    const setPrimaryMode = useDashboardStore((s) => s.setPrimaryMode);

    const publishCmdVel = usePublisher<Twist>(
        '/cmd_vel',
        'geometry_msgs/Twist',
    );

    const isEditableTarget = useCallback(
        (target: EventTarget | null): boolean => {
            if (!target || !(target instanceof Element)) return false;

            const tagName = target.tagName;
            if (EDITABLE_ELEMENTS.includes(tagName)) return true;

            const role = target.getAttribute('role');
            if (role && ARROW_CONSUMING_ROLES.includes(role)) return true;

            if (target.getAttribute('contenteditable') === 'true') return true;

            return false;
        },
        [],
    );

    const canUseJoystick = useCallback((): boolean => {
        if (!isConnected) return false;

        if (primaryMode === 'slam') {
            if (slamSubmode === 'navigation') return false;
            if (autoExplore) return false;
            return true;
        }

        if (primaryMode === 'tracking') {
            return manualOverride;
        }

        return false;
    }, [isConnected, primaryMode, slamSubmode, autoExplore, manualOverride]);

    const handleEmergencyStop = useCallback(() => {
        if (!isConnected) return;

        publishCmdVel({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        });

        console.log('[DashboardKeyboard] Emergency stop triggered');
    }, [isConnected, publishCmdVel]);

    const handleArrowKey = useCallback(
        (key: string) => {
            if (!canUseJoystick()) return;

            const MAX_LINEAR = 0.3;
            const MAX_ANGULAR = 1.0;

            let linear_x = 0;
            let angular_z = 0;

            switch (key) {
                case 'ArrowUp':
                    linear_x = MAX_LINEAR;
                    break;
                case 'ArrowDown':
                    linear_x = -MAX_LINEAR;
                    break;
                case 'ArrowLeft':
                    angular_z = MAX_ANGULAR;
                    break;
                case 'ArrowRight':
                    angular_z = -MAX_ANGULAR;
                    break;
            }

            publishCmdVel({
                linear: { x: linear_x, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: angular_z },
            });
        },
        [canUseJoystick, publishCmdVel],
    );

    const handleArrowKeyUp = useCallback(() => {
        if (!canUseJoystick()) return;

        publishCmdVel({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        });
    }, [canUseJoystick, publishCmdVel]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isEditableTarget(e.target)) {
                e.preventDefault();
                handleEmergencyStop();
                return;
            }

            if (e.key === '1' && !isEditableTarget(e.target)) {
                e.preventDefault();
                setPrimaryMode('slam');
                return;
            }

            if (e.key === '2' && !isEditableTarget(e.target)) {
                e.preventDefault();
                setPrimaryMode('tracking');
                return;
            }

            const arrowKeys = [
                'ArrowUp',
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
            ];
            if (arrowKeys.includes(e.key) && !isEditableTarget(e.target)) {
                e.preventDefault();
                handleArrowKey(e.key);
                return;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const arrowKeys = [
                'ArrowUp',
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
            ];
            if (arrowKeys.includes(e.key) && !isEditableTarget(e.target)) {
                e.preventDefault();
                handleArrowKeyUp();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [
        isEditableTarget,
        handleEmergencyStop,
        handleArrowKey,
        handleArrowKeyUp,
        setPrimaryMode,
    ]);

    return <>{children}</>;
}
