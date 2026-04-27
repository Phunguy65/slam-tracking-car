/**
 * Picture-in-Picture overlay for secondary camera view during SLAM mode.
 *
 * Renders camera stream as a draggable secondary surface over the map workspace.
 * Supports free drag positioning via pointer events and corner snap cycling
 * via the Move button.
 */
'use client';

import { Maximize2, Minimize2, Move, Video, VideoOff, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { CameraStream } from '@/components/tracking/camera-stream.tsx';
import { usePublisher } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import {
    type PipPosition,
    useDashboardStore,
} from '@/stores/dashboard-store.ts';

interface DragPosition {
    x: number;
    y: number;
}

const POSITION_CLASSES: Record<PipPosition, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
};

function clampPosition(
    x: number,
    y: number,
    container: HTMLElement,
): DragPosition {
    const parent = container.parentElement;
    if (!parent) return { x, y };

    const parentRect = parent.getBoundingClientRect();
    const elementRect = container.getBoundingClientRect();

    const maxX = parentRect.width - elementRect.width;
    const maxY = parentRect.height - elementRect.height;

    return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
    };
}

export function PictureInPicture() {
    const pipPosition = useDashboardStore((s) => s.pipPosition);
    const setPipEnabled = useDashboardStore((s) => s.setPipEnabled);
    const setPipPosition = useDashboardStore((s) => s.setPipPosition);
    const cameraStreamEnabled = useDashboardStore((s) => s.cameraStreamEnabled);
    const setCameraStreamEnabled = useDashboardStore(
        (s) => s.setCameraStreamEnabled,
    );
    const [isExpanded, setIsExpanded] = useState(false);
    const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const publish = usePublisher<{ data: boolean }>(
        '/cam/stream_enable',
        'std_msgs/msg/Bool',
    );

    const sectionRef = useRef<HTMLElement>(null);
    const dragStartRef = useRef<{
        pointerX: number;
        pointerY: number;
        elementX: number;
        elementY: number;
    } | null>(null);

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
        setDragPosition(null);
    }, [pipPosition, setPipPosition]);

    const handleStreamToggle = useCallback(() => {
        const newValue = !cameraStreamEnabled;
        setCameraStreamEnabled(newValue);
        publish({ data: newValue });
    }, [cameraStreamEnabled, setCameraStreamEnabled, publish]);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if ((e.target as HTMLElement).closest('button')) return;

            const section = sectionRef.current;
            if (!section) return;

            e.preventDefault();
            const rect = section.getBoundingClientRect();
            const parentRect = section.parentElement?.getBoundingClientRect();
            if (!parentRect) return;

            dragStartRef.current = {
                pointerX: e.clientX,
                pointerY: e.clientY,
                elementX: rect.left - parentRect.left,
                elementY: rect.top - parentRect.top,
            };
            setIsDragging(true);

            const handlePointerMove = (moveEvent: PointerEvent) => {
                if (!dragStartRef.current || !section) return;

                const deltaX =
                    moveEvent.clientX - dragStartRef.current.pointerX;
                const deltaY =
                    moveEvent.clientY - dragStartRef.current.pointerY;

                const newX = dragStartRef.current.elementX + deltaX;
                const newY = dragStartRef.current.elementY + deltaY;

                const clamped = clampPosition(newX, newY, section);
                setDragPosition(clamped);
            };

            const handlePointerUp = () => {
                dragStartRef.current = null;
                setIsDragging(false);
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        },
        [],
    );

    const sizeClasses = isExpanded
        ? 'w-80 h-60 md:w-96 md:h-72'
        : 'w-48 h-36 md:w-64 md:h-48';

    const isFreeDragged = dragPosition !== null;

    return (
        <section
            ref={sectionRef}
            className={cn(
                'absolute z-20 rounded-lg overflow-hidden',
                'bg-black border border-border/40 shadow-xl',
                !isDragging && 'transition-all duration-200',
                !isFreeDragged && POSITION_CLASSES[pipPosition],
                sizeClasses,
            )}
            style={
                isFreeDragged
                    ? { top: dragPosition.y, left: dragPosition.x }
                    : undefined
            }
            aria-label='Camera picture-in-picture view'
        >
            <div className='absolute inset-0'>
                <CameraStream enabled={cameraStreamEnabled} />
            </div>

            <div
                className='absolute top-0 left-0 right-0 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/60 to-transparent cursor-grab active:cursor-grabbing'
                onPointerDown={handlePointerDown}
            >
                <span className='text-xs font-medium text-white/80 px-1 select-none'>
                    Camera
                </span>
                <div className='flex items-center gap-1'>
                    <button
                        type='button'
                        onClick={cyclePosition}
                        className='p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors'
                        title='Snap to corner'
                        aria-label='Snap picture-in-picture to next corner'
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
                        onClick={handleStreamToggle}
                        className='p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors'
                        title={
                            cameraStreamEnabled
                                ? 'Disable stream'
                                : 'Enable stream'
                        }
                        aria-label={
                            cameraStreamEnabled
                                ? 'Disable camera stream'
                                : 'Enable camera stream'
                        }
                    >
                        {cameraStreamEnabled ? (
                            <Video className='size-3.5' />
                        ) : (
                            <VideoOff className='size-3.5' />
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
