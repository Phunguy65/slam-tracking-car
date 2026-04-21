/**
 * SLAM panels for dashboard layout.
 *
 * Renders contextual SLAM controls based on submode (mapping/navigation).
 */
'use client';

import { Compass, Map as MapIcon, Save } from 'lucide-react';
import { InitialPoseSetter } from '@/components/slam/initial-pose-setter.tsx';
import { MapSelector } from '@/components/slam/map-selector.tsx';
import { NavigationStatus } from '@/components/slam/navigation-status.tsx';
import { SaveMapButton } from '@/components/slam/save-map-button.tsx';
import { HudPanel } from '@/components/ui/hud-panel.tsx';
import { ViewportSwitcher } from '@/components/viewport/viewport-switcher.tsx';
import { useDashboardStore } from '@/stores/dashboard-store.ts';

export function SlamPanels() {
    const slamSubmode = useDashboardStore((s) => s.slamSubmode);

    if (slamSubmode === 'navigation') {
        return <NavigationPanels />;
    }

    return <MappingPanels />;
}

function MappingPanels() {
    return (
        <>
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
            <ViewportSwitcher />
        </>
    );
}

function NavigationPanels() {
    return (
        <>
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
            <HudPanel
                title='Maps'
                icon={<MapIcon className='size-4' />}
                collapsible={true}
                defaultCollapsed={true}
            >
                <MapSelector />
            </HudPanel>
            <ViewportSwitcher />
        </>
    );
}
