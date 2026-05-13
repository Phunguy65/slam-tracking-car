/**
 * Unified Dashboard orchestrator component.
 *
 * Provides the SLAM operator workspace with persistent header, adaptive
 * viewport, control panels, and status bar.
 */
'use client';

import { useState } from 'react';
import { ManualJoystick } from '@/components/slam/manual-joystick.tsx';
import { ServoPanControl } from '@/components/slam/servo-pan-control.tsx';
import { PictureInPicture } from '@/components/viewport/picture-in-picture.tsx';
import { PrimaryViewport } from '@/components/viewport/primary-viewport.tsx';
import { SwappableMinimap } from '@/components/viewport/swappable-minimap.tsx';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import { DashboardKeyboardHandler } from './dashboard-keyboard-handler.tsx';
import { LogMonitor } from './log-monitor.tsx';
import { ModeController } from './mode-controller.tsx';
import { ReconnectOverlay } from './reconnect-overlay.tsx';
import { SlamPanels } from './slam-panels.tsx';
import { StatusBar } from './status-bar.tsx';

export function UnifiedDashboard() {
    const status = useRosStore((s) => s.status);
    const isConnected = status === 'connected';
    const primaryMode = useDashboardStore((s) => s.primaryMode);
    const slamSubmode = useDashboardStore((s) => s.slamSubmode);
    const pipEnabled = useDashboardStore((s) => s.pipEnabled);
    const minimapEnabled = useDashboardStore((s) => s.minimapEnabled);
    const minimapViewMode = useDashboardStore((s) => s.minimapViewMode);
    const autoExplore = useDashboardStore((s) => s.autoExplore);

    const [logOpen, setLogOpen] = useState(false);

    const isSlam = primaryMode === 'slam';

    const showMappingJoystick =
        isSlam && slamSubmode === 'mapping' && !autoExplore;

    return (
        <DashboardKeyboardHandler>
            <div className='flex-1 relative flex flex-col overflow-hidden bg-slate-950'>
                <div className='flex-1 relative'>
                    <PrimaryViewport
                        slamSubmode={slamSubmode}
                        minimapViewMode={minimapViewMode}
                    />

                    {isSlam && pipEnabled && <PictureInPicture />}

                    <div className='absolute inset-0 pointer-events-none p-4'>
                        <div className='flex items-start justify-between pointer-events-auto'>
                            <ModeController disabled={!isConnected} />
                        </div>

                        <div className='absolute bottom-4 left-4 right-4 flex items-end justify-between'>
                            <div className='flex flex-col gap-3 pointer-events-auto max-w-xs'>
                                {minimapEnabled && <SwappableMinimap />}
                                {isSlam && <SlamPanels />}
                            </div>

                            <div className='pointer-events-auto'>
                                {showMappingJoystick && (
                                    <ManualJoystick showLabel={true} />
                                )}
                            </div>
                        </div>

                        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto'>
                            <ServoPanControl />
                        </div>
                    </div>
                </div>

                <LogMonitor open={logOpen} />

                <StatusBar
                    logOpen={logOpen}
                    onToggleLog={() => setLogOpen((prev) => !prev)}
                />

                <ReconnectOverlay />
            </div>
        </DashboardKeyboardHandler>
    );
}
