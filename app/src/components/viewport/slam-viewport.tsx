/**
 * SLAM viewport wrapper for dashboard.
 *
 * Renders unified map with optional goal setter overlay for navigation mode.
 */
'use client';

import { GoalSetter } from '@/components/slam/goal-setter.tsx';
import { UnifiedMap } from '@/components/slam/unified-map.tsx';
import type { SlamSubmode } from '@/stores/dashboard-store.ts';

interface SlamViewportProps {
    submode: SlamSubmode;
}

export function SlamViewport({ submode }: SlamViewportProps) {
    return (
        <div className='absolute inset-0 bg-slate-950'>
            <UnifiedMap showLidar={true} className='absolute inset-0'>
                <GoalSetter enabled={submode === 'navigation'} />
            </UnifiedMap>
        </div>
    );
}
