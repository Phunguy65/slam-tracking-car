/**
 * Unified Dashboard orchestrator component.
 *
 * Consolidates SLAM and tracking workflows into a single operator workspace
 * with persistent header, adaptive viewport, control panels, and status bar.
 */
'use client';

import { ManualJoystick } from '@/components/slam/manual-joystick.tsx';
import { MinimapOverlay } from '@/components/viewport/minimap-overlay.tsx';
import { PictureInPicture } from '@/components/viewport/picture-in-picture.tsx';
import { PrimaryViewport } from '@/components/viewport/primary-viewport.tsx';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import { DashboardKeyboardHandler } from './dashboard-keyboard-handler.tsx';
import { ModeController } from './mode-controller.tsx';
import { ReconnectOverlay } from './reconnect-overlay.tsx';
import { SlamPanels } from './slam-panels.tsx';
import { StatusBar } from './status-bar.tsx';
import { TrackingPanels } from './tracking-panels.tsx';

export function UnifiedDashboard() {
    const status = useRosStore((s) => s.status);
    const isConnected = status === 'connected';
    const primaryMode = useDashboardStore((s) => s.primaryMode);
    const slamSubmode = useDashboardStore((s) => s.slamSubmode);
    const pipEnabled = useDashboardStore((s) => s.pipEnabled);
    const minimapEnabled = useDashboardStore((s) => s.minimapEnabled);
    const autoExplore = useDashboardStore((s) => s.autoExplore);
    const manualOverride = useDashboardStore((s) => s.manualOverride);

    const isSlam = primaryMode === 'slam';
    const isTracking = primaryMode === 'tracking';

    const showMappingJoystick =
        isSlam && slamSubmode === 'mapping' && !autoExplore;
    const showTrackingJoystick = isTracking && manualOverride;

    return (
        <DashboardKeyboardHandler>
            <div className='flex-1 relative flex flex-col overflow-hidden bg-slate-950'>
                <div className='flex-1 relative'>
                    <PrimaryViewport
                        mode={primaryMode}
                        slamSubmode={slamSubmode}
                    />

                    {isSlam && pipEnabled && <PictureInPicture />}

                    {isTracking && minimapEnabled && <MinimapOverlay />}

                    <div className='absolute inset-0 pointer-events-none p-4'>
                        <div className='flex items-start justify-between pointer-events-auto'>
                            <ModeController disabled={!isConnected} />
                        </div>

                        <div className='absolute bottom-4 left-4 right-4 flex items-end justify-between'>
                            <div className='flex flex-col gap-3 pointer-events-auto max-w-xs'>
                                {isSlam && <SlamPanels />}
                                {isTracking && <TrackingPanels />}
                            </div>

                            <div className='pointer-events-auto'>
                                {(showMappingJoystick
                                    || showTrackingJoystick) && (
                                    <ManualJoystick showLabel={true} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <StatusBar />

                <ReconnectOverlay />
            </div>
        </DashboardKeyboardHandler>
    );
}
