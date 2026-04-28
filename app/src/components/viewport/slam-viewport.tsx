/**
 * SLAM viewport wrapper for dashboard.
 *
 * Renders unified map with optional goal setter overlay for navigation mode.
 * When minimap is in map mode, LiDAR radar is rendered as a main viewport overlay.
 */
'use client';

import { GoalSetter } from '@/components/slam/goal-setter.tsx';
import { LidarRadar } from '@/components/slam/lidar-radar.tsx';
import { UnifiedMap } from '@/components/slam/unified-map.tsx';
import type { MinimapViewMode, SlamSubmode } from '@/stores/dashboard-store.ts';

interface SlamViewportProps {
    submode: SlamSubmode;
    minimapViewMode: MinimapViewMode;
}

export function SlamViewport({ submode, minimapViewMode }: SlamViewportProps) {
    const showMainRadar = minimapViewMode === 'map';

    return (
        <div className='absolute inset-0 bg-slate-950'>
            <UnifiedMap showLidar={false} className='absolute inset-0'>
                <GoalSetter enabled={submode === 'navigation'} />
            </UnifiedMap>
            {showMainRadar && <LidarRadar className='absolute inset-0' />}
        </div>
    );
}
