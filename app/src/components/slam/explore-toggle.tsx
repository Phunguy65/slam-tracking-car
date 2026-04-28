/**
 * Explore toggle component for frontier exploration.
 */
'use client';

import { useCallback, useState } from 'react';
import { Switch } from '@/components/ui/switch.tsx';
import { usePublisher, useTopic } from '@/hooks/use-topic.ts';
import { useNavStore } from '@/stores/nav-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import { ExploreState, type ExploreStatus } from '@/types/ros-messages.ts';

export function ExploreToggle() {
    const status = useRosStore((s) => s.status);
    const [isExploring, setIsExploring] = useState(false);
    const cancelNav = useNavStore((s) => s.cancel);

    const publishExplore = usePublisher<{ data: boolean }>(
        '/explore/resume',
        'std_msgs/Bool',
    );

    useTopic<ExploreStatus>(
        '/explore/status',
        'explore_lite_msgs/ExploreStatus',
        (message) => {
            setIsExploring(message.status === ExploreState.EXPLORING);
        },
    );

    const handleToggle = useCallback(
        (enabled: boolean) => {
            if (!enabled) {
                cancelNav();
            }
            publishExplore({ data: enabled });
        },
        [publishExplore, cancelNav],
    );

    return (
        <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
                <label htmlFor='explore-toggle' className='text-sm font-medium'>
                    Auto Exploration
                </label>
                <p className='text-xs text-muted-foreground'>
                    {isExploring
                        ? 'Robot exploring frontiers...'
                        : 'Frontier exploration disabled'}
                </p>
            </div>
            <Switch
                id='explore-toggle'
                checked={isExploring}
                onCheckedChange={handleToggle}
                disabled={status !== 'connected'}
            />
        </div>
    );
}
