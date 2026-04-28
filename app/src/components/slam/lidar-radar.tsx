/**
 * LiDAR radar view component.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { renderLaserScan } from '@/lib/laser-scan.ts';
import { cn } from '@/lib/utils.ts';
import type { LaserScan } from '@/types/ros-messages.ts';

interface LidarRadarProps {
    className?: string;
    compact?: boolean;
    size?: number;
}

export function LidarRadar({
    className,
    compact = false,
    size = 200,
}: LidarRadarProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scanRef = useRef<LaserScan | null>(null);

    useEffect(() => {
        if (compact) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = size;
            canvas.height = size;
            if (scanRef.current) {
                const ctx = canvas.getContext('2d');
                if (ctx) renderLaserScan(ctx, scanRef.current, size, size);
            }
            return;
        }

        const updateCanvasSize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const currentSize = Math.min(
                container.clientWidth,
                container.clientHeight,
            );
            canvas.width = currentSize;
            canvas.height = currentSize;

            if (scanRef.current) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    renderLaserScan(
                        ctx,
                        scanRef.current,
                        currentSize,
                        currentSize,
                    );
                }
            }
        };

        updateCanvasSize();

        const observer = new ResizeObserver(updateCanvasSize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [compact, size]);

    const handleScan = useCallback((msg: LaserScan) => {
        scanRef.current = msg;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        renderLaserScan(ctx, msg, canvas.width, canvas.height);
    }, []);

    useTopic<LaserScan>('/scan', 'sensor_msgs/LaserScan', handleScan, {
        throttleRate: 200,
    });

    return (
        <div
            ref={containerRef}
            className={cn(
                compact
                    ? 'flex items-center justify-center'
                    : 'absolute inset-0 flex items-center justify-center',
                className,
            )}
        >
            <canvas
                ref={canvasRef}
                className={compact ? 'block' : 'max-w-full max-h-full'}
                role='img'
                aria-label='LiDAR point cloud radar view'
            />
        </div>
    );
}
