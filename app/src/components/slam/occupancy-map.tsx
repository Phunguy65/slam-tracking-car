/**
 * Occupancy map component that renders live SLAM map.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { renderOccupancyGrid } from '@/lib/occupancy-grid.ts';
import type { OccupancyGrid } from '@/types/ros-messages.ts';

export function OccupancyMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<OccupancyGrid | null>(null);

    // Handle resize
    useEffect(() => {
        const updateCanvasSize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            // Re-render if we have a grid
            if (gridRef.current) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    renderOccupancyGrid(
                        ctx,
                        gridRef.current,
                        canvas.width,
                        canvas.height,
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
    }, []);

    // Handle incoming map updates
    const handleMap = useCallback((msg: OccupancyGrid) => {
        gridRef.current = msg;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        renderOccupancyGrid(ctx, msg, canvas.width, canvas.height);
    }, []);

    useTopic<OccupancyGrid>(
        '/map',
        'nav_msgs/OccupancyGrid',
        handleMap,
        { throttleRate: 1000 }, // Update at most once per second
    );

    return (
        <div ref={containerRef} className='absolute inset-0'>
            <canvas
                ref={canvasRef}
                className='w-full h-full'
                role='img'
                aria-label='SLAM occupancy grid map'
            />
        </div>
    );
}
