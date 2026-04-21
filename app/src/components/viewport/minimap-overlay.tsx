/**
 * Minimap overlay for compact map context during tracking mode.
 *
 * Renders a smaller occupancy map with robot position for spatial awareness.
 */
'use client';

import { MapPin, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { renderOccupancyGrid, worldToCanvas } from '@/lib/occupancy-grid.ts';
import { findTransform, quaternionToYaw } from '@/lib/tf-listener.ts';
import { cn } from '@/lib/utils.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import type { OccupancyGrid, TFMessage } from '@/types/ros-messages.ts';

const MINIMAP_SIZE = 180;
const ROBOT_COLOR = 'rgba(0, 200, 255, 0.9)';
const ROBOT_SIZE = 8;

interface RobotPose {
    x: number;
    y: number;
    yaw: number;
}

export function MinimapOverlay() {
    const setMinimapEnabled = useDashboardStore((s) => s.setMinimapEnabled);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridRef = useRef<OccupancyGrid | null>(null);
    const poseRef = useRef<RobotPose | null>(null);

    const handleClose = useCallback(() => {
        setMinimapEnabled(false);
    }, [setMinimapEnabled]);

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
            ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

            const grid = gridRef.current;
            const pose = poseRef.current;

            if (grid) {
                const transform = renderOccupancyGrid(
                    ctx,
                    grid,
                    MINIMAP_SIZE,
                    MINIMAP_SIZE,
                );

                if (pose && transform) {
                    const robotCanvas = worldToCanvas(
                        pose.x,
                        pose.y,
                        grid,
                        transform.scale,
                        transform.offsetX,
                        transform.offsetY,
                        MINIMAP_SIZE,
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
                ctx.fillText('No map', MINIMAP_SIZE / 2, MINIMAP_SIZE / 2);
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

    return (
        <section
            className={cn(
                'absolute bottom-20 right-4 z-20',
                'rounded-lg overflow-hidden',
                'bg-slate-950 border border-border/40 shadow-xl',
            )}
            aria-label='Minimap showing robot position'
        >
            <div className='flex items-center justify-between px-2 py-1.5 bg-background/70 border-b border-border/30'>
                <div className='flex items-center gap-1.5 text-xs font-medium text-foreground/80'>
                    <MapPin className='size-3.5' />
                    <span>Map</span>
                </div>
                <button
                    type='button'
                    onClick={handleClose}
                    className='p-0.5 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors'
                    title='Close minimap'
                    aria-label='Close minimap'
                >
                    <X className='size-3.5' />
                </button>
            </div>
            <canvas
                ref={canvasRef}
                width={MINIMAP_SIZE}
                height={MINIMAP_SIZE}
                className='block'
                role='img'
                aria-label='Minimap with robot position'
            />
        </section>
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
