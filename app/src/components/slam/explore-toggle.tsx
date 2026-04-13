/**
 * Explore toggle component for frontier exploration.
 */
'use client';

import { useCallback } from 'react';
import { Switch } from '@/components/ui/switch.tsx';
import { useAction } from '@/hooks/use-action.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import type {
    ExploreFeedback,
    ExploreGoal,
    ExploreResult,
} from '@/types/ros-messages.ts';

export function ExploreToggle() {
    const status = useRosStore((s) => s.status);
    const { isExecuting, sendGoal, cancel } = useAction<
        ExploreGoal,
        ExploreFeedback,
        ExploreResult
    >('/explore/explore', 'explore_lite/Explore');

    const handleToggle = useCallback(
        (enabled: boolean) => {
            if (enabled) {
                sendGoal({});
            } else {
                cancel();
            }
        },
        [sendGoal, cancel],
    );

    return (
        <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
                <label htmlFor='explore-toggle' className='text-sm font-medium'>
                    Auto Exploration
                </label>
                <p className='text-xs text-muted-foreground'>
                    {isExecuting
                        ? 'Robot exploring frontiers...'
                        : 'Frontier exploration disabled'}
                </p>
            </div>
            <Switch
                id='explore-toggle'
                checked={isExecuting}
                onCheckedChange={handleToggle}
                disabled={status !== 'connected'}
            />
        </div>
    );
}
