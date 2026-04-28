/**
 * Swappable minimap with two-phase animation.
 *
 * Clicking the panel toggles between LiDAR radar view and Occupancy Grid + Robot marker.
 */
'use client';

import { Map as MapIcon, Radar, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LidarRadar } from '@/components/slam/lidar-radar.tsx';
import { useTopic } from '@/hooks/use-topic.ts';
import { renderOccupancyGrid, worldToCanvas } from '@/lib/occupancy-grid.ts';
import { findTransform, quaternionToYaw } from '@/lib/tf-listener.ts';
import { cn } from '@/lib/utils.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import type { OccupancyGrid, TFMessage } from '@/types/ros-messages.ts';

const MINIMAP_WIDTH = 240;
const MINIMAP_HEIGHT = 140;
const ROBOT_COLOR = 'rgba(0, 200, 255, 0.9)';
const ROBOT_SIZE = 8;

interface RobotPose {
    x: number;
    y: number;
    yaw: number;
}

export function SwappableMinimap() {
    const minimapEnabled = useDashboardStore((s) => s.minimapEnabled);
    const minimapViewMode = useDashboardStore((s) => s.minimapViewMode);
    const setMinimapEnabled = useDashboardStore((s) => s.setMinimapEnabled);
    const toggleMinimapViewMode = useDashboardStore(
        (s) => s.toggleMinimapViewMode,
    );

    if (!minimapEnabled) return null;

    return (
        <SwappableMinimapInner
            viewMode={minimapViewMode}
            onSwap={toggleMinimapViewMode}
            onClose={() => setMinimapEnabled(false)}
        />
    );
}

interface SwappableMinimapInnerProps {
    viewMode: 'lidar' | 'map';
    onSwap: () => void;
    onClose: () => void;
}

function SwappableMinimapInner({
    viewMode,
    onSwap,
    onClose,
}: SwappableMinimapInnerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridRef = useRef<OccupancyGrid | null>(null);
    const poseRef = useRef<RobotPose | null>(null);
    const displayedModeRef = useRef<'lidar' | 'map'>(viewMode);
    const [animationPhase, setAnimationPhase] = useState<'out' | 'in' | null>(
        null,
    );
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const [displayedMode, setDisplayedMode] = useState<'lidar' | 'map'>(
        viewMode,
    );
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        displayedModeRef.current = viewMode;
        setDisplayedMode(viewMode);
    }, [viewMode]);

    const handleSwap = useCallback(() => {
        if (animationPhase !== null) return;
        setAnimationPhase('out');
        animationTimeoutRef.current = setTimeout(() => {
            onSwap();
            setAnimationPhase('in');
            animationTimeoutRef.current = setTimeout(() => {
                setAnimationPhase(null);
            }, 200);
        }, 200);
    }, [animationPhase, onSwap]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSwap();
            }
        },
        [handleSwap],
    );

    useEffect(() => {
        let animationId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                animationId = requestAnimationFrame(render);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                animationId = requestAnimationFrame(render);
                return;
            }

            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

            const grid = gridRef.current;
            const pose = poseRef.current;

            if (grid) {
                const transform = renderOccupancyGrid(
                    ctx,
                    grid,
                    MINIMAP_WIDTH,
                    MINIMAP_HEIGHT,
                );

                if (pose && transform) {
                    const robotCanvas = worldToCanvas(
                        pose.x,
                        pose.y,
                        grid,
                        transform.scale,
                        transform.offsetX,
                        transform.offsetY,
                        MINIMAP_HEIGHT,
                    );

                    drawRobotMarker(
                        ctx,
                        robotCanvas.x,
                        robotCanvas.y,
                        pose.yaw,
                    );
                }
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('No map', MINIMAP_WIDTH / 2, MINIMAP_HEIGHT / 2);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, []);

    const handleMap = useCallback((msg: OccupancyGrid) => {
        gridRef.current = msg;
    }, []);

    useTopic<OccupancyGrid>('/map', 'nav_msgs/OccupancyGrid', handleMap, {
        throttleRate: 2000,
    });

    const handleTF = useCallback((msg: TFMessage) => {
        const transform =
            findTransform(msg, 'map', 'base_footprint')
            ?? findTransform(msg, 'map', 'base_link')
            ?? findTransform(msg, 'odom', 'base_footprint')
            ?? findTransform(msg, 'odom', 'base_link');

        if (transform) {
            poseRef.current = {
                x: transform.transform.translation.x,
                y: transform.transform.translation.y,
                yaw: quaternionToYaw(transform.transform.rotation),
            };
        }
    }, []);

    useTopic<TFMessage>('/tf', 'tf2_msgs/TFMessage', handleTF, {
        throttleRate: 200,
    });

    const isLidar = displayedMode === 'lidar';
    const modeLabel = isLidar ? 'LiDAR' : 'Map';
    const ariaLabel = `Minimap showing ${modeLabel.toLowerCase()} view. Click to swap.`;
    const animationClass =
        animationPhase === 'out'
            ? 'animate-minimap-out'
            : animationPhase === 'in'
              ? 'animate-minimap-in'
              : undefined;

    return (
        <div className='relative'>
            <button
                type='button'
                className={cn(
                    'cursor-pointer',
                    'rounded-lg overflow-hidden',
                    'bg-slate-950 border border-border/40 shadow-xl',
                    'transition-colors duration-150',
                    hovered ? 'border-primary/60' : 'border-border/40',
                )}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                aria-label={ariaLabel}
                onClick={handleSwap}
                onKeyDown={handleKeyDown}
            >
                <div className='flex items-center justify-between px-2 py-1.5 bg-background/70 border-b border-border/30'>
                    <div className='flex items-center gap-1.5 text-xs font-medium text-foreground/80'>
                        {isLidar ? (
                            <Radar className='size-3.5' />
                        ) : (
                            <MapIcon className='size-3.5' />
                        )}
                        <span>{modeLabel}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                        {hovered && (
                            <span className='text-[10px] text-muted-foreground animate-minimap-in'>
                                click to swap
                            </span>
                        )}
                    </div>
                </div>
                <div
                    className={cn('relative', animationClass)}
                    style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
                >
                    {isLidar ? (
                        <LidarRadar compact size={MINIMAP_HEIGHT} />
                    ) : (
                        <canvas
                            ref={canvasRef}
                            width={MINIMAP_WIDTH}
                            height={MINIMAP_HEIGHT}
                            className='block'
                            role='img'
                            aria-label='Minimap with robot position'
                        />
                    )}
                </div>
            </button>
            <button
                type='button'
                className={cn(
                    'absolute top-1 right-1',
                    'p-0.5 rounded',
                    'hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors',
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                title='Close minimap'
                aria-label='Close minimap'
            >
                <X className='size-3.5' />
            </button>
        </div>
    );
}

function drawRobotMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    yaw: number,
): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-yaw + Math.PI / 2);

    ctx.fillStyle = ROBOT_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, -ROBOT_SIZE);
    ctx.lineTo(-ROBOT_SIZE * 0.6, ROBOT_SIZE * 0.6);
    ctx.lineTo(ROBOT_SIZE * 0.6, ROBOT_SIZE * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = ROBOT_COLOR;
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.restore();
}
