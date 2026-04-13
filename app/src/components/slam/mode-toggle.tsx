/**
 * Mode toggle component - segmented control for Mapping/Navigation modes.
 *
 * Calls /map_manager/set_mode service to switch between SLAM and Navigation modes.
 * Shows loading spinner during mode switch and error toast on failure.
 */
'use client';

import { Loader2, Map as MapIcon, Navigation, RefreshCw } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils.ts';
import { useModeStore, type SlamMode } from '@/stores/mode-store.ts';

interface ModeToggleProps {
    /** Whether toggle is disabled (e.g., not connected) */
    disabled?: boolean;
    /** Additional className */
    className?: string;
}

export function ModeToggle({ disabled = false, className }: ModeToggleProps) {
    const {
        currentMode,
        isSwitching,
        error,
        canRetry,
        setMode,
        retry,
        clearError,
    } = useModeStore();

    // Auto-clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(clearError, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    const handleModeChange = useCallback(
        async (newMode: SlamMode) => {
            if (newMode === currentMode || isSwitching) return;
            await setMode(newMode);
        },
        [currentMode, isSwitching, setMode],
    );

    const isDisabled = disabled || isSwitching;

    return (
        <div className='flex flex-col gap-2'>
            <div
                className={cn(
                    'inline-flex items-center rounded-lg p-1',
                    'bg-background/70 backdrop-blur-md',
                    'border border-border/40 shadow-lg',
                    isDisabled && 'opacity-50',
                    className,
                )}
                role='tablist'
                aria-label='SLAM mode selection'
            >
                <button
                    type='button'
                    role='tab'
                    aria-selected={currentMode === 'mapping'}
                    aria-controls='mapping-panel'
                    onClick={() => handleModeChange('mapping')}
                    disabled={isDisabled}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md',
                        'text-sm font-medium transition-all',
                        currentMode === 'mapping'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                        isDisabled && 'pointer-events-none',
                    )}
                >
                    {isSwitching && currentMode === 'navigation' ? (
                        <Loader2 className='size-4 animate-spin' />
                    ) : (
                        <MapIcon className='size-4' />
                    )}
                    <span>Map</span>
                </button>

                <button
                    type='button'
                    role='tab'
                    aria-selected={currentMode === 'navigation'}
                    aria-controls='navigation-panel'
                    onClick={() => handleModeChange('navigation')}
                    disabled={isDisabled}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md',
                        'text-sm font-medium transition-all',
                        currentMode === 'navigation'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                        isDisabled && 'pointer-events-none',
                    )}
                >
                    {isSwitching && currentMode === 'mapping' ? (
                        <Loader2 className='size-4 animate-spin' />
                    ) : (
                        <Navigation className='size-4' />
                    )}
                    <span>Nav</span>
                </button>
            </div>

            {/* Error toast with retry button */}
            {error && (
                <div
                    className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg',
                        'bg-destructive/10 backdrop-blur-md',
                        'border border-destructive/30',
                        'text-xs text-destructive',
                    )}
                    role='alert'
                >
                    <span className='flex-1'>{error}</span>
                    {canRetry && (
                        <button
                            type='button'
                            onClick={retry}
                            className='flex items-center gap-1 px-2 py-1 rounded bg-destructive/20 hover:bg-destructive/30 transition-colors'
                        >
                            <RefreshCw className='size-3' />
                            <span>Retry</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// Re-export SlamMode type for backwards compatibility
export type { SlamMode };
