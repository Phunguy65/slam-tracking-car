/**
 * Person overlay component that draws bounding boxes on tracked persons.
 *
 * Subscribes to /tracked_persons and renders body bboxes, face bboxes,
 * and name labels on Canvas.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import type { TrackedPerson, TrackedPersonArray } from '@/types/enrollment.ts';

// Colors for tracked persons
const TARGET_COLOR = 'rgba(0, 255, 128, 0.9)';
const TARGET_FILL = 'rgba(0, 255, 128, 0.15)';
const OTHER_COLOR = 'rgba(128, 128, 255, 0.7)';
const OTHER_FILL = 'rgba(128, 128, 255, 0.1)';
const FACE_COLOR = 'rgba(255, 255, 0, 0.8)';
const UNKNOWN_COLOR = 'rgba(255, 128, 0, 0.7)';
const UNKNOWN_FILL = 'rgba(255, 128, 0, 0.1)';

export function PersonOverlay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const personsRef = useRef<TrackedPerson[]>([]);

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

            // Draw persons
            for (const person of personsRef.current) {
                const body = person.body_bbox;

                // Convert normalized coords to pixels
                const bodyX = (body.center_x - body.width / 2) * width;
                const bodyY = (body.center_y - body.height / 2) * height;
                const bodyW = body.width * width;
                const bodyH = body.height * height;

                // Choose colors based on status
                let borderColor: string;
                let fillColor: string;
                if (person.is_target) {
                    borderColor = TARGET_COLOR;
                    fillColor = TARGET_FILL;
                } else if (person.person_id) {
                    borderColor = OTHER_COLOR;
                    fillColor = OTHER_FILL;
                } else {
                    borderColor = UNKNOWN_COLOR;
                    fillColor = UNKNOWN_FILL;
                }

                // Draw body bbox
                ctx.fillStyle = fillColor;
                ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

                ctx.strokeStyle = borderColor;
                ctx.lineWidth = person.is_target ? 3 : 2;
                ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);

                // Draw face bbox if visible
                if (person.face_visible) {
                    const face = person.face_bbox;
                    const faceX = (face.center_x - face.width / 2) * width;
                    const faceY = (face.center_y - face.height / 2) * height;
                    const faceW = face.width * width;
                    const faceH = face.height * height;

                    ctx.strokeStyle = FACE_COLOR;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(faceX, faceY, faceW, faceH);
                    ctx.setLineDash([]);
                }

                // Draw label background and text
                const label = person.person_id
                    ? `${person.person_id.slice(0, 8)}${person.is_target ? ' (TARGET)' : ''}`
                    : 'Unknown';
                const confidence =
                    person.confidence > 0
                        ? ` ${Math.round(person.confidence * 100)}%`
                        : '';
                const labelText = label + confidence;

                ctx.font = 'bold 12px sans-serif';
                const textWidth = ctx.measureText(labelText).width;
                const padding = 4;
                const labelX = bodyX;
                const labelY = bodyY - 4;

                // Background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(
                    labelX - padding,
                    labelY - 14 - padding,
                    textWidth + padding * 2,
                    14 + padding * 2,
                );

                // Text
                ctx.fillStyle = borderColor;
                ctx.fillText(labelText, labelX, labelY);

                // Draw target indicator
                if (person.is_target) {
                    const centerX = body.center_x * width;
                    const centerY = body.center_y * height;

                    // Crosshair
                    ctx.strokeStyle = TARGET_COLOR;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(centerX - 15, centerY);
                    ctx.lineTo(centerX - 5, centerY);
                    ctx.moveTo(centerX + 5, centerY);
                    ctx.lineTo(centerX + 15, centerY);
                    ctx.moveTo(centerX, centerY - 15);
                    ctx.lineTo(centerX, centerY - 5);
                    ctx.moveTo(centerX, centerY + 5);
                    ctx.lineTo(centerX, centerY + 15);
                    ctx.stroke();
                }
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, []);

    // Handle incoming tracked persons
    const handleTrackedPersons = useCallback((msg: TrackedPersonArray) => {
        personsRef.current = msg.persons;
    }, []);

    useTopic<TrackedPersonArray>(
        '/tracked_persons',
        'slam_car_interfaces/msg/TrackedPersonArray',
        handleTrackedPersons,
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
