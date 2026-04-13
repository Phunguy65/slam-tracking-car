/**
 * Goal setter component for click-to-navigate.
 *
 * Overlay on the map that allows setting navigation goals.
 * Shows clear visual feedback for interaction state.
 */
'use client';

import { Navigation, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { yawToQuaternion } from '@/lib/tf-listener.ts';
import { cn } from '@/lib/utils.ts';
import { useNavStore } from '@/stores/nav-store.ts';
import type { PoseStamped } from '@/types/ros-messages.ts';

interface GoalSetterProps {
    /** Whether goal setting is enabled */
    enabled?: boolean;
}

export function GoalSetter({ enabled = true }: GoalSetterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { isExecuting, sendGoal, cancel } = useNavStore();
    const [isHovering, setIsHovering] = useState(false);

    const handleClick = useCallback(
        (
            event:
                | React.MouseEvent<HTMLDivElement>
                | { clientX: number; clientY: number },
        ) => {
            if (!enabled) return;

            if (isExecuting) {
                cancel();
                return;
            }

            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            // Convert click to normalized coordinates (0-1)
            const normalizedX = clickX / rect.width;
            const normalizedY = clickY / rect.height;

            // Convert to map coordinates (this is a simplification)
            // In production, this would use the actual map transform
            // For now, assume map is centered and 10m x 10m
            const mapX = (normalizedX - 0.5) * 10;
            const mapY = (0.5 - normalizedY) * 10; // Flip Y

            const goalPose: PoseStamped = {
                header: {
                    stamp: { sec: 0, nanosec: 0 },
                    frame_id: 'map',
                },
                pose: {
                    position: { x: mapX, y: mapY, z: 0 },
                    orientation: yawToQuaternion(0), // Face forward
                },
            };

            sendGoal(goalPose);
        },
        [enabled, isExecuting, sendGoal, cancel],
    );

    if (!enabled) return null;

    return (
        // biome-ignore lint/a11y/useSemanticElements: Need div overlay for map click positioning
        <div
            ref={containerRef}
            className={cn(
                'absolute inset-0 transition-colors',
                isExecuting
                    ? 'cursor-pointer bg-destructive/5'
                    : 'cursor-crosshair',
                isHovering && !isExecuting && 'bg-primary/5',
            )}
            onClick={handleClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                        handleClick({
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top + rect.height / 2,
                        });
                    }
                }
            }}
            role='button'
            tabIndex={0}
            aria-label={
                isExecuting
                    ? 'Click to cancel navigation'
                    : 'Click to set navigation goal'
            }
        >
            {/* Instruction banner - shows when not navigating */}
            {!isExecuting && (
                <div
                    className={cn(
                        'absolute top-3 left-1/2 -translate-x-1/2',
                        'flex items-center gap-2 px-3 py-1.5 rounded-full',
                        'bg-background/80 backdrop-blur-sm',
                        'border border-border/50 shadow-lg',
                        'text-xs text-muted-foreground',
                        'transition-opacity',
                        isHovering ? 'opacity-100' : 'opacity-60',
                    )}
                >
                    <Navigation className='size-3.5' />
                    <span>Click anywhere to set destination</span>
                </div>
            )}

            {/* Navigation active banner */}
            {isExecuting && (
                <div
                    className={cn(
                        'absolute top-3 left-1/2 -translate-x-1/2',
                        'flex items-center gap-2 px-3 py-1.5 rounded-full',
                        'bg-primary/90 backdrop-blur-sm',
                        'border border-primary/50 shadow-lg',
                        'text-xs text-primary-foreground font-medium',
                        'animate-pulse',
                    )}
                >
                    <Navigation className='size-3.5' />
                    <span>Navigating...</span>
                    <button
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            cancel();
                        }}
                        className={cn(
                            'ml-1 p-0.5 rounded-full',
                            'bg-primary-foreground/20 hover:bg-primary-foreground/30',
                            'transition-colors',
                        )}
                        aria-label='Cancel navigation'
                    >
                        <X className='size-3' />
                    </button>
                </div>
            )}
        </div>
    );
}
