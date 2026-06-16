/**
 * Tracking panels for dashboard layout.
 *
 * Renders tracking controls, status, target selection, and manual override.
 */
'use client';

import { Settings, Target, UserPlus, Users } from 'lucide-react';
import { useCallback } from 'react';
import { PidTuner } from '@/components/tracking/pid-tuner.tsx';
import { TrackingStatus } from '@/components/tracking/tracking-status.tsx';
import { Button } from '@/components/ui/button.tsx';
import { HudPanel } from '@/components/ui/hud-panel.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { ViewportSwitcher } from '@/components/viewport/viewport-switcher.tsx';
import { usePublisher } from '@/hooks/use-topic.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useEnrollmentStore } from '@/stores/enrollment-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type { Twist } from '@/types/ros-messages.ts';
import { EnrollModal } from './enroll-modal.tsx';

interface BoolMsg {
    data: boolean;
}

export function TrackingPanels() {
    const status = useRosStore((s) => s.status);
    const isConnected = status === 'connected';
    const trackingEnabled = useDashboardStore((s) => s.trackingEnabled);
    const manualOverride = useDashboardStore((s) => s.manualOverride);
    const setTrackingEnabled = useDashboardStore((s) => s.setTrackingEnabled);
    const setManualOverride = useDashboardStore((s) => s.setManualOverride);
    const setEnrollModalOpen = useDashboardStore((s) => s.setEnrollModalOpen);
    const enrollModalOpen = useDashboardStore((s) => s.enrollModalOpen);
    const targetPerson = useDashboardStore((s) => s.targetPerson);
    const persons = useEnrollmentStore((s) => s.persons);
    const isLoading = useEnrollmentStore((s) => s.isLoading);
    const error = useEnrollmentStore((s) => s.error);
    const clearError = useEnrollmentStore((s) => s.setError);

    const publishCmdVel = usePublisher<Twist>(
        '/cmd_vel',
        'geometry_msgs/Twist',
    );

    const publishTrackingEnabled = usePublisher<BoolMsg>(
        '/tracking_controller/enabled',
        'std_msgs/Bool',
    );

    const handleTrackingToggle = useCallback(
        (enabled: boolean) => {
            setTrackingEnabled(enabled);
            publishTrackingEnabled({ data: enabled });
            if (!enabled) {
                publishCmdVel({
                    linear: { x: 0, y: 0, z: 0 },
                    angular: { x: 0, y: 0, z: 0 },
                });
            }
        },
        [setTrackingEnabled, publishCmdVel, publishTrackingEnabled],
    );

    const handleManualOverrideToggle = useCallback(
        (override: boolean) => {
            setManualOverride(override);
            publishTrackingEnabled({ data: false });
            if (override) {
                setTrackingEnabled(false);
            }
        },
        [setManualOverride, setTrackingEnabled, publishTrackingEnabled],
    );

    const targetName = targetPerson
        ? (persons.find((p) => p.person_id === targetPerson)?.name ?? 'Unknown')
        : 'Any person';

    return (
        <>
            <HudPanel
                title='Tracking'
                icon={<Target className='size-4' />}
                collapsible={true}
                defaultCollapsed={false}
            >
                <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                            <label
                                htmlFor='tracking-toggle-dash'
                                className='text-sm font-medium'
                            >
                                Face Tracking
                            </label>
                            <p className='text-xs text-muted-foreground'>
                                {trackingEnabled
                                    ? 'Following detected faces'
                                    : 'Tracking disabled'}
                            </p>
                        </div>
                        <Switch
                            id='tracking-toggle-dash'
                            checked={trackingEnabled}
                            onCheckedChange={handleTrackingToggle}
                            disabled={!isConnected || manualOverride}
                        />
                    </div>

                    <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                            <label
                                htmlFor='manual-override-toggle'
                                className='text-sm font-medium'
                            >
                                Manual Override
                            </label>
                            <p className='text-xs text-muted-foreground'>
                                {manualOverride
                                    ? 'Joystick control active'
                                    : 'Use joystick manually'}
                            </p>
                        </div>
                        <Switch
                            id='manual-override-toggle'
                            checked={manualOverride}
                            onCheckedChange={handleManualOverrideToggle}
                            disabled={!isConnected}
                        />
                    </div>

                    <div className='border-t border-border/30 pt-3'>
                        <TrackingStatus />
                    </div>
                </div>
            </HudPanel>

            <HudPanel
                title='Target'
                icon={<Users className='size-4' />}
                collapsible={true}
                defaultCollapsed={false}
            >
                <div className='space-y-3' data-testid='target-panel'>
                    {!isConnected ? (
                        <div
                            className='rounded-lg border border-dashed border-border/60 p-4 text-center'
                            data-testid='target-panel-disconnected'
                        >
                            <p className='text-sm font-medium text-muted-foreground'>
                                Disconnected
                            </p>
                            <p className='mt-1 text-xs text-muted-foreground'>
                                Reconnect rosbridge to manage targets.
                            </p>
                        </div>
                    ) : error ? (
                        <div
                            className='rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center'
                            data-testid='target-panel-error'
                        >
                            <p className='text-sm font-medium text-destructive'>
                                {error}
                            </p>
                            <Button
                                size='sm'
                                variant='outline'
                                className='mt-3 w-full'
                                onClick={() => clearError(null)}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : isLoading ? (
                        <div
                            className='rounded-lg border border-dashed border-border/60 p-4 text-center'
                            data-testid='target-panel-loading'
                        >
                            <p className='text-sm font-medium text-muted-foreground'>
                                Loading…
                            </p>
                        </div>
                    ) : persons.length === 0 ? (
                        <div
                            className='rounded-lg border border-dashed border-border/60 p-4 text-center'
                            data-testid='target-panel-empty'
                        >
                            <p className='text-sm font-medium'>
                                No persons enrolled
                            </p>
                            <p className='mt-1 text-xs text-muted-foreground'>
                                Add a person to start target tracking.
                            </p>
                            <Button
                                size='sm'
                                className='mt-3 w-full'
                                onClick={() => setEnrollModalOpen(true)}
                            >
                                <UserPlus className='size-4 mr-2' />
                                Add person
                            </Button>
                        </div>
                    ) : (
                        <div data-testid='target-panel-active'>
                            <div className='flex items-center justify-between text-sm'>
                                <span className='text-muted-foreground'>
                                    Current Target
                                </span>
                                <span className='font-medium'>
                                    {targetName}
                                </span>
                            </div>
                            <Button
                                variant='outline'
                                size='sm'
                                className='mt-3 w-full'
                                onClick={() => setEnrollModalOpen(true)}
                            >
                                <UserPlus className='size-4 mr-2' />
                                Manage Persons
                            </Button>
                        </div>
                    )}
                </div>
            </HudPanel>

            <HudPanel
                title='PID Tuning'
                icon={<Settings className='size-4' />}
                collapsible={true}
                defaultCollapsed={true}
            >
                <PidTuner />
            </HudPanel>

            <ViewportSwitcher />

            <EnrollModal
                open={enrollModalOpen}
                onOpenChange={setEnrollModalOpen}
            />
        </>
    );
}
