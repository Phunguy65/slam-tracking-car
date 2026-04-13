/**
 * Unified Map component - combines OccupancyMap + LiDAR overlay + RobotMarker.
 *
 * This component renders all map visualization layers on a single canvas,
 * maintaining consistent coordinate transforms between layers.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { renderLaserScanOverlay } from '@/lib/laser-scan.ts';
import { renderOccupancyGrid, worldToCanvas } from '@/lib/occupancy-grid.ts';
import { findTransform, quaternionToYaw } from '@/lib/tf-listener.ts';
import { cn } from '@/lib/utils.ts';
import type {
    LaserScan,
    OccupancyGrid,
    TFMessage,
} from '@/types/ros-messages.ts';

// Robot marker appearance
const ROBOT_COLOR = 'rgba(0, 200, 255, 0.9)';
const ROBOT_SIZE = 15; // pixels
const LIDAR_COLOR = 'rgba(0, 255, 180, 0.6)';

interface MapTransform {
    scale: number;
    offsetX: number;
    offsetY: number;
}

interface RobotPose {
    x: number;
    y: number;
    yaw: number;
}

interface UnifiedMapProps {
    /** Whether to show LiDAR overlay */
    showLidar?: boolean;
    /** Additional className for the container */
    className?: string;
    /** Children to render as overlay (e.g., GoalSetter) */
    children?: React.ReactNode;
}

export function UnifiedMap({
    showLidar = true,
    className,
    children,
}: UnifiedMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Data refs for rendering
    const gridRef = useRef<OccupancyGrid | null>(null);
    const scanRef = useRef<LaserScan | null>(null);
    const poseRef = useRef<RobotPose | null>(null);
    const transformRef = useRef<MapTransform | null>(null);

    // Handle resize
    useEffect(() => {
        const updateCanvasSize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };

        updateCanvasSize();

        const observer = new ResizeObserver(updateCanvasSize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Animation loop for rendering all layers
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

            const { width, height } = canvas;

            // Clear canvas with dark background
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, width, height);

            const grid = gridRef.current;
            const scan = scanRef.current;
            const pose = poseRef.current;

            // Layer 1: Occupancy Grid
            if (grid) {
                const transform = renderOccupancyGrid(ctx, grid, width, height);
                transformRef.current = transform;

                // Layer 2: LiDAR Overlay (requires both scan data and robot pose)
                if (showLidar && scan && pose && transform) {
                    // Convert robot world position to canvas coordinates
                    const robotCanvas = worldToCanvas(
                        pose.x,
                        pose.y,
                        grid,
                        transform.scale,
                        transform.offsetX,
                        transform.offsetY,
                        height,
                    );

                    renderLaserScanOverlay(
                        ctx,
                        scan,
                        robotCanvas.x,
                        robotCanvas.y,
                        pose.yaw,
                        transform.scale,
                        LIDAR_COLOR,
                    );
                }

                // Layer 3: Robot Marker
                if (pose && transform) {
                    const robotCanvas = worldToCanvas(
                        pose.x,
                        pose.y,
                        grid,
                        transform.scale,
                        transform.offsetX,
                        transform.offsetY,
                        height,
                    );

                    drawRobotMarker(
                        ctx,
                        robotCanvas.x,
                        robotCanvas.y,
                        pose.yaw,
                    );
                }
            } else {
                // No map data - show placeholder
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '14px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Waiting for map data...', width / 2, height / 2);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, [showLidar]);

    // Subscribe to map updates
    const handleMap = useCallback((msg: OccupancyGrid) => {
        gridRef.current = msg;
    }, []);

    useTopic<OccupancyGrid>('/map', 'nav_msgs/OccupancyGrid', handleMap, {
        throttleRate: 1000, // 1 Hz
    });

    // Subscribe to laser scan
    const handleScan = useCallback((msg: LaserScan) => {
        scanRef.current = msg;
    }, []);

    useTopic<LaserScan>('/scan', 'sensor_msgs/LaserScan', handleScan, {
        throttleRate: 200, // 5 Hz
        enabled: showLidar,
    });

    // Subscribe to TF for robot pose
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
        throttleRate: 100, // 10 Hz
    });

    return (
        <div
            ref={containerRef}
            className={cn('relative w-full h-full bg-slate-950', className)}
        >
            <canvas
                ref={canvasRef}
                className='w-full h-full'
                role='img'
                aria-label='SLAM map with LiDAR overlay and robot position'
            />
            {/* Overlay children (e.g., GoalSetter) */}
            {children}
        </div>
    );
}

/**
 * Draw robot marker as a triangle pointing in the direction of travel.
 */
function drawRobotMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    yaw: number,
): void {
    ctx.save();
    ctx.translate(x, y);
    // Rotate: ROS yaw is CCW from X-axis, canvas Y is inverted
    ctx.rotate(-yaw + Math.PI / 2);

    // Triangle pointing up (forward direction after rotation)
    ctx.fillStyle = ROBOT_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, -ROBOT_SIZE); // Front point
    ctx.lineTo(-ROBOT_SIZE * 0.6, ROBOT_SIZE * 0.6); // Back left
    ctx.lineTo(ROBOT_SIZE * 0.6, ROBOT_SIZE * 0.6); // Back right
    ctx.closePath();
    ctx.fill();

    // Glow effect
    ctx.shadowColor = ROBOT_COLOR;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}
