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

    const publishCmdVel = usePublisher<Twist>(
        '/cmd_vel',
        'geometry_msgs/Twist',
    );

    const handleTrackingToggle = useCallback(
        (enabled: boolean) => {
            setTrackingEnabled(enabled);
            if (!enabled) {
                publishCmdVel({
                    linear: { x: 0, y: 0, z: 0 },
                    angular: { x: 0, y: 0, z: 0 },
                });
            }
        },
        [setTrackingEnabled, publishCmdVel],
    );

    const handleManualOverrideToggle = useCallback(
        (override: boolean) => {
            setManualOverride(override);
            if (override) {
                setTrackingEnabled(false);
            }
        },
        [setManualOverride, setTrackingEnabled],
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
                <div className='space-y-3'>
                    <div className='flex items-center justify-between text-sm'>
                        <span className='text-muted-foreground'>
                            Current Target
                        </span>
                        <span className='font-medium'>{targetName}</span>
                    </div>
                    <Button
                        variant='outline'
                        size='sm'
                        className='w-full'
                        onClick={() => setEnrollModalOpen(true)}
                    >
                        <UserPlus className='size-4 mr-2' />
                        Manage Persons
                    </Button>
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
