/**
 * Mode toggle component - segmented control for Mapping/Navigation modes.
 */
'use client';

import { Map as MapIcon, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export type SlamMode = 'mapping' | 'navigation';

interface ModeToggleProps {
    /** Current mode */
    mode: SlamMode;
    /** Callback when mode changes */
    onModeChange: (mode: SlamMode) => void;
    /** Whether toggle is disabled */
    disabled?: boolean;
    /** Additional className */
    className?: string;
}

export function ModeToggle({
    mode,
    onModeChange,
    disabled = false,
    className,
}: ModeToggleProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center rounded-lg p-1',
                'bg-background/70 backdrop-blur-md',
                'border border-border/40 shadow-lg',
                disabled && 'opacity-50 pointer-events-none',
                className,
            )}
            role='tablist'
            aria-label='SLAM mode selection'
        >
            <button
                type='button'
                role='tab'
                aria-selected={mode === 'mapping'}
                aria-controls='mapping-panel'
                onClick={() => onModeChange('mapping')}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md',
                    'text-sm font-medium transition-all',
                    mode === 'mapping'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                )}
            >
                <MapIcon className='size-4' />
                <span>Map</span>
            </button>

            <button
                type='button'
                role='tab'
                aria-selected={mode === 'navigation'}
                aria-controls='navigation-panel'
                onClick={() => onModeChange('navigation')}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md',
                    'text-sm font-medium transition-all',
                    mode === 'navigation'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                )}
            >
                <Navigation className='size-4' />
                <span>Nav</span>
            </button>
        </div>
    );
}
