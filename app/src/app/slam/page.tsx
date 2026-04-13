/**
 * SLAM mode page - unified workspace with full-screen map and floating HUD panels.
 *
 * Features:
 * - Single unified map (Occupancy + LiDAR overlay)
 * - Mode toggle (Mapping / Navigation) with lifecycle management
 * - Floating glassmorphic control panels
 * - Collapsible panels for clean view
 */
'use client';

import { Compass, Map as MapIcon, Save } from 'lucide-react';
import { ExploreToggle } from '@/components/slam/explore-toggle.tsx';
import { GoalSetter } from '@/components/slam/goal-setter.tsx';
import { InitialPoseSetter } from '@/components/slam/initial-pose-setter.tsx';
import { ManualJoystick } from '@/components/slam/manual-joystick.tsx';
import { MapSelector } from '@/components/slam/map-selector.tsx';
import { ModeToggle } from '@/components/slam/mode-toggle.tsx';
import { NavigationStatus } from '@/components/slam/navigation-status.tsx';
import { SaveMapButton } from '@/components/slam/save-map-button.tsx';
import { UnifiedMap } from '@/components/slam/unified-map.tsx';
import { HudPanel } from '@/components/ui/hud-panel.tsx';
import { useModeStore } from '@/stores/mode-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';

export default function SlamPage() {
    const status = useRosStore((s) => s.status);
    const isConnected = status === 'connected';
    const currentMode = useModeStore((s) => s.currentMode);

    return (
        <div className='flex-1 relative overflow-hidden bg-slate-950'>
            {/* Full-screen unified map */}
            <UnifiedMap showLidar={true} className='absolute inset-0'>
                {/* GoalSetter overlay - only in navigation mode */}
                <GoalSetter enabled={currentMode === 'navigation'} />
            </UnifiedMap>

            {/* Floating HUD panels */}
            <div className='absolute inset-0 pointer-events-none p-4'>
                {/* Top row: Mode toggle + Explore toggle */}
                <div className='flex items-start justify-between pointer-events-auto'>
                    {/* Mode toggle - top left */}
                    <ModeToggle disabled={!isConnected} />

                    {/* Explore toggle - top right (only in mapping mode) */}
                    {currentMode === 'mapping' && (
                        <HudPanel
                            title='Auto Explore'
                            icon={<Compass className='size-4' />}
                            collapsible={true}
                            defaultCollapsed={false}
                        >
                            <ExploreToggle />
                        </HudPanel>
                    )}
                </div>

                {/* Bottom row: Status panel (left) + Joystick (right) */}
                <div className='absolute bottom-4 left-4 right-4 flex items-end justify-between'>
                    {/* Left side panels */}
                    <div className='flex flex-col gap-3 pointer-events-auto max-w-xs'>
                        {/* Navigation Status - only in navigation mode */}
                        {currentMode === 'navigation' && (
                            <HudPanel
                                title='Navigation'
                                icon={<Compass className='size-4' />}
                                collapsible={true}
                                defaultCollapsed={false}
                            >
                                <div className='space-y-4'>
                                    <NavigationStatus />
                                    <InitialPoseSetter compact />
                                </div>
                            </HudPanel>
                        )}

                        {/* Map Management - only in mapping mode */}
                        {currentMode === 'mapping' && (
                            <HudPanel
                                title='Map Management'
                                icon={<Save className='size-4' />}
                                collapsible={true}
                                defaultCollapsed={false}
                            >
                                <div className='space-y-4'>
                                    <SaveMapButton />
                                    <div className='border-t border-border/30 pt-3'>
                                        <MapSelector />
                                    </div>
                                </div>
                            </HudPanel>
                        )}

                        {/* Map Selector - in navigation mode for loading maps */}
                        {currentMode === 'navigation' && (
                            <HudPanel
                                title='Maps'
                                icon={<MapIcon className='size-4' />}
                                collapsible={true}
                                defaultCollapsed={true}
                            >
                                <MapSelector />
                            </HudPanel>
                        )}
                    </div>

                    {/* Right side: Joystick (always visible) */}
                    <div className='pointer-events-auto'>
                        <ManualJoystick showLabel={true} />
                    </div>
                </div>
            </div>
        </div>
    );
}
