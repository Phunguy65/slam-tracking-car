/**
 * Navigation status component showing goal progress.
 */
'use client';

import { useNavStore } from '@/stores/nav-store.ts';

export function NavigationStatus() {
    const { isExecuting, feedback, error } = useNavStore();

    if (error) {
        return (
            <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Status</span>
                    <span className='text-destructive font-medium'>Error</span>
                </div>
                <p className='text-xs text-muted-foreground'>{error}</p>
            </div>
        );
    }

    if (!isExecuting) {
        return (
            <div className='text-center text-muted-foreground py-4 text-sm'>
                <p>No active navigation goal</p>
                <p className='text-xs mt-1'>Click on the map to set a goal</p>
            </div>
        );
    }

    return (
        <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
                <span className='text-muted-foreground'>Status</span>
                <span
                    className='text-primary font-medium'
                    role='status'
                    aria-live='polite'
                >
                    Navigating
                </span>
            </div>

            {feedback && (
                <>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Distance</span>
                        <span className='font-data font-medium'>
                            {feedback.distance_remaining?.toFixed(2) ?? '—'} m
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>ETA</span>
                        <span className='font-data font-medium'>
                            {feedback.estimated_time_remaining
                                ? `${feedback.estimated_time_remaining.sec}s`
                                : '—'}
                        </span>
                    </div>
                    <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                            Recoveries
                        </span>
                        <span className='font-data font-medium'>
                            {feedback.number_of_recoveries ?? 0}
                        </span>
                    </div>
                </>
            )}

            {/* Progress bar */}
            <div className='h-1.5 bg-muted rounded-full overflow-hidden'>
                <div
                    className='h-full bg-primary animate-pulse'
                    style={{ width: '100%' }}
                />
            </div>
        </div>
    );
}
