/**
 * Camera stream component with Canvas rendering.
 *
 * Subscribes to compressed image topic and renders frames.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import {
    decodeCompressedImage,
    drawImageToCanvas,
} from '@/lib/compressed-image.ts';
import type { CompressedImage } from '@/types/ros-messages.ts';

export function CameraStream() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Handle incoming images
    const handleImage = useCallback(async (msg: CompressedImage) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            const img = await decodeCompressedImage(msg);
            drawImageToCanvas(ctx, img, canvas.width, canvas.height);
        } catch (err) {
            console.error('[CameraStream] Failed to decode image:', err);
        }
    }, []);

    useTopic<CompressedImage>(
        '/camera/image_raw/compressed',
        'sensor_msgs/CompressedImage',
        handleImage,
        { throttleRate: 33 }, // ~30fps max
    );

    return (
        <div ref={containerRef} className='absolute inset-0'>
            <canvas
                ref={canvasRef}
                className='w-full h-full'
                role='img'
                aria-label='Live camera feed from robot'
            />
        </div>
    );
}
