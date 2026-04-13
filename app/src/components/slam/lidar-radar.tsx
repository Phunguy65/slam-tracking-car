/**
 * LiDAR radar view component.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { renderLaserScan } from '@/lib/laser-scan.ts';
import type { LaserScan } from '@/types/ros-messages.ts';

export function LidarRadar() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scanRef = useRef<LaserScan | null>(null);

    // Handle resize
    useEffect(() => {
        const updateCanvasSize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            // Make it square based on smaller dimension
            const size = Math.min(
                container.clientWidth,
                container.clientHeight,
            );
            canvas.width = size;
            canvas.height = size;

            // Re-render if we have a scan
            if (scanRef.current) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    renderLaserScan(ctx, scanRef.current, size, size);
                }
            }
        };

        updateCanvasSize();

        const observer = new ResizeObserver(updateCanvasSize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Handle incoming scan data
    const handleScan = useCallback((msg: LaserScan) => {
        scanRef.current = msg;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        renderLaserScan(ctx, msg, canvas.width, canvas.height);
    }, []);

    useTopic<LaserScan>(
        '/scan',
        'sensor_msgs/LaserScan',
        handleScan,
        { throttleRate: 200 }, // 5 Hz
    );

    return (
        <div
            ref={containerRef}
            className='absolute inset-0 flex items-center justify-center'
        >
            <canvas
                ref={canvasRef}
                className='max-w-full max-h-full'
                role='img'
                aria-label='LiDAR point cloud radar view'
            />
        </div>
    );
}
