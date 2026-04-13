/**
 * Robot marker component that shows robot position on the map.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { findTransform, quaternionToYaw } from '@/lib/tf-listener.ts';
import type { TFMessage } from '@/types/ros-messages.ts';

// Robot marker appearance
const ROBOT_COLOR = 'rgba(0, 200, 255, 0.9)';
const ROBOT_SIZE = 15; // pixels

export function RobotMarker() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const poseRef = useRef<{ x: number; y: number; yaw: number } | null>(null);

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

    // Animation loop
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
            ctx.clearRect(0, 0, width, height);

            const pose = poseRef.current;
            if (!pose) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // For now, draw robot at center of canvas
            // In a full implementation, this would use the same coordinate
            // transform as the occupancy grid
            const centerX = width / 2;
            const centerY = height / 2;

            // Draw robot as triangle pointing in yaw direction
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(-pose.yaw + Math.PI / 2); // Adjust for canvas coordinates

            ctx.fillStyle = ROBOT_COLOR;
            ctx.beginPath();
            ctx.moveTo(0, -ROBOT_SIZE); // Front point
            ctx.lineTo(-ROBOT_SIZE * 0.6, ROBOT_SIZE * 0.6); // Back left
            ctx.lineTo(ROBOT_SIZE * 0.6, ROBOT_SIZE * 0.6); // Back right
            ctx.closePath();
            ctx.fill();

            // Draw outline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, []);

    // Handle TF messages
    const handleTF = useCallback((msg: TFMessage) => {
        // Look for map -> base_footprint transform
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

    useTopic<TFMessage>(
        '/tf',
        'tf2_msgs/TFMessage',
        handleTF,
        { throttleRate: 100 }, // 10 Hz
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
