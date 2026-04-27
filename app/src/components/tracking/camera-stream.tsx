/**
 * Camera stream component with Canvas rendering.
 *
 * Subscribes to compressed image topic and renders frames when enabled.
 * Renders a "Stream Off" placeholder when streaming is disabled.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import {
    decodeCompressedImage,
    drawImageToCanvas,
} from '@/lib/compressed-image.ts';
import type { CompressedImage } from '@/types/ros-messages.ts';

interface CameraStreamProps {
    enabled?: boolean;
}

/**
 * Renders the live camera feed or a disabled placeholder.
 *
 * @param enabled - Whether to subscribe and render incoming frames.
 *   Defaults to `true`. When `false`, stops the subscription and shows
 *   a "Stream Off" placeholder instead.
 */
export function CameraStream({ enabled = true }: CameraStreamProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
        { throttleRate: 33, enabled }, // ~30fps max; gated on enabled flag
    );

    if (!enabled) {
        return (
            <div
                ref={containerRef}
                className='absolute inset-0 bg-black flex items-center justify-center'
            >
                <span className='text-slate-500 font-mono text-sm'>
                    Stream Off
                </span>
            </div>
        );
    }

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
