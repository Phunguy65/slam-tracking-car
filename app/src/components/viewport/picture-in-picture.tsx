/**
 * Picture-in-Picture overlay for secondary camera view during SLAM mode.
 *
 * Renders camera stream as a movable secondary surface over the map workspace.
 */
'use client';

import { Maximize2, Minimize2, Move, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { CameraStream } from '@/components/tracking/camera-stream.tsx';
import { cn } from '@/lib/utils.ts';
import {
    type PipPosition,
    useDashboardStore,
} from '@/stores/dashboard-store.ts';

const POSITION_CLASSES: Record<PipPosition, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
};

export function PictureInPicture() {
    const pipPosition = useDashboardStore((s) => s.pipPosition);
    const setPipEnabled = useDashboardStore((s) => s.setPipEnabled);
    const setPipPosition = useDashboardStore((s) => s.setPipPosition);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleClose = useCallback(() => {
        setPipEnabled(false);
    }, [setPipEnabled]);

    const handleToggleSize = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const cyclePosition = useCallback(() => {
        const positions: PipPosition[] = [
            'top-right',
            'top-left',
            'bottom-left',
            'bottom-right',
        ];
        const currentIndex = positions.indexOf(pipPosition);
        const nextIndex = (currentIndex + 1) % positions.length;
        setPipPosition(positions[nextIndex]);
    }, [pipPosition, setPipPosition]);

    const sizeClasses = isExpanded
        ? 'w-80 h-60 md:w-96 md:h-72'
        : 'w-48 h-36 md:w-64 md:h-48';

    return (
        <section
            className={cn(
                'absolute z-20 rounded-lg overflow-hidden',
                'bg-black border border-border/40 shadow-xl',
                'transition-all duration-200',
                POSITION_CLASSES[pipPosition],
                sizeClasses,
            )}
            aria-label='Camera picture-in-picture view'
        >
            <div className='absolute inset-0'>
                <CameraStream />
            </div>

            <div className='absolute top-0 left-0 right-0 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/60 to-transparent'>
                <span className='text-xs font-medium text-white/80 px-1'>
                    Camera
                </span>
                <div className='flex items-center gap-1'>
                    <button
                        type='button'
                        onClick={cyclePosition}
                        className='p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors'
                        title='Move position'
                        aria-label='Move picture-in-picture position'
                    >
                        <Move className='size-3.5' />
                    </button>
                    <button
                        type='button'
                        onClick={handleToggleSize}
                        className='p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors'
                        title={isExpanded ? 'Minimize' : 'Maximize'}
                        aria-label={
                            isExpanded ? 'Minimize view' : 'Maximize view'
                        }
                    >
                        {isExpanded ? (
                            <Minimize2 className='size-3.5' />
                        ) : (
                            <Maximize2 className='size-3.5' />
                        )}
                    </button>
                    <button
                        type='button'
                        onClick={handleClose}
                        className='p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors'
                        title='Close'
                        aria-label='Close picture-in-picture'
                    >
                        <X className='size-3.5' />
                    </button>
                </div>
            </div>
        </section>
    );
}
