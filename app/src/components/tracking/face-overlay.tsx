/**
 * Face overlay component that draws bounding boxes on detected faces.
 *
 * Subscribes to /face_detections and renders overlays on Canvas.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import type { Pose, PoseArray } from '@/types/ros-messages.ts';

// Colors for face bounding boxes
const FACE_COLOR = 'rgba(0, 255, 128, 0.8)';
const FACE_FILL = 'rgba(0, 255, 128, 0.1)';

export function FaceOverlay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const facesRef = useRef<Pose[]>([]);

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

    // Animation loop for smooth rendering
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

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw faces
            // Face poses use normalized coordinates:
            // position.x = center x (0-1, left to right)
            // position.y = center y (0-1, top to bottom)
            // position.z = width (0-1, normalized by frame width)
            // orientation.w = height (0-1, normalized by frame height)
            for (const face of facesRef.current) {
                const centerX = face.position.x * width;
                const centerY = face.position.y * height;
                const faceWidth = face.position.z * width;
                const faceHeight =
                    (face.orientation?.w ?? face.position.z) * height;

                const x = centerX - faceWidth / 2;
                const y = centerY - faceHeight / 2;

                // Draw filled rectangle
                ctx.fillStyle = FACE_FILL;
                ctx.fillRect(x, y, faceWidth, faceHeight);

                // Draw border
                ctx.strokeStyle = FACE_COLOR;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, faceWidth, faceHeight);

                // Draw crosshair at center
                ctx.beginPath();
                ctx.moveTo(centerX - 10, centerY);
                ctx.lineTo(centerX + 10, centerY);
                ctx.moveTo(centerX, centerY - 10);
                ctx.lineTo(centerX, centerY + 10);
                ctx.stroke();
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, []);

    // Handle incoming face detections
    const handleDetections = useCallback((msg: PoseArray) => {
        facesRef.current = msg.poses;
    }, []);

    useTopic<PoseArray>(
        '/face_detections',
        'geometry_msgs/PoseArray',
        handleDetections,
    );

    return (
        <div
            ref={containerRef}
            className='absolute inset-0 pointer-events-none'
        >
            <canvas ref={canvasRef} className='w-full h-full' />
        </div>
    );
}
