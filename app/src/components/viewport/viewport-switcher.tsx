/**
 * Viewport switcher component for toggling secondary views.
 *
 * Allows operators to toggle PiP camera (SLAM) or minimap (Tracking).
 */
'use client';

import { Camera, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';

export function ViewportSwitcher() {
    const primaryMode = useDashboardStore((s) => s.primaryMode);
    const pipEnabled = useDashboardStore((s) => s.pipEnabled);
    const minimapEnabled = useDashboardStore((s) => s.minimapEnabled);
    const setPipEnabled = useDashboardStore((s) => s.setPipEnabled);
    const setMinimapEnabled = useDashboardStore((s) => s.setMinimapEnabled);

    const isSlam = primaryMode === 'slam';

    if (isSlam) {
        return (
            <button
                type='button'
                onClick={() => setPipEnabled(!pipEnabled)}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    'bg-background/70 backdrop-blur-md',
                    'border border-border/40 shadow-lg',
                    'text-sm font-medium',
                    'hover:bg-background/80 transition-colors',
                    pipEnabled
                        ? 'text-primary border-primary/50'
                        : 'text-muted-foreground',
                )}
                title={pipEnabled ? 'Hide camera PiP' : 'Show camera PiP'}
                aria-pressed={pipEnabled}
            >
                <Camera className='size-4' />
                <span className='hidden sm:inline'>Camera</span>
            </button>
        );
    }

    return (
        <button
            type='button'
            onClick={() => setMinimapEnabled(!minimapEnabled)}
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                'bg-background/70 backdrop-blur-md',
                'border border-border/40 shadow-lg',
                'text-sm font-medium',
                'hover:bg-background/80 transition-colors',
                minimapEnabled
                    ? 'text-primary border-primary/50'
                    : 'text-muted-foreground',
            )}
            title={minimapEnabled ? 'Hide minimap' : 'Show minimap'}
            aria-pressed={minimapEnabled}
        >
            <MapIcon className='size-4' />
            <span className='hidden sm:inline'>Map</span>
        </button>
    );
}
