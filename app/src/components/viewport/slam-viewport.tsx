/**
 * SLAM viewport wrapper for dashboard.
 *
 * Swaps between Map and LiDAR as the main viewport content so that
 * clicking the minimap truly moves its content into the main view and
 * vice versa. Only one is rendered at a time (not overlaid).
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
    if (minimapViewMode === 'map') {
        return (
            <div className='absolute inset-0 bg-slate-950'>
                <LidarRadar className='absolute inset-0' />
            </div>
        );
    }

    return (
        <div className='absolute inset-0 bg-slate-950'>
            <UnifiedMap showLidar={false} className='absolute inset-0'>
                <GoalSetter enabled={submode === 'navigation'} />
            </UnifiedMap>
        </div>
    );
}
