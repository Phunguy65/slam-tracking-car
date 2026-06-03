/**
 * Webcam capture component for enrollment.
 *
 * Uses getUserMedia to capture frames from laptop webcam,
 * encodes as base64 JPEG, and publishes to /enrollment/image topic.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePublisher } from '@/hooks/use-topic.ts';
import type { CompressedImage } from '@/types/ros-messages.ts';

const TARGET_FPS = 10;
const JPEG_QUALITY = 0.8;

interface WebcamCaptureProps {
    /** Overlay components (scan effect, etc.) */
    children?: React.ReactNode;
    /** Called when webcam access is denied */
    onAccessDenied?: () => void;
}

export function WebcamCapture({
    children,
    onAccessDenied,
}: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const frameCountRef = useRef(0);

    // Publisher for enrollment images
    const publishImage = usePublisher<CompressedImage>(
        '/enrollment/image',
        'sensor_msgs/CompressedImage',
    );

    // Start webcam
    useEffect(() => {
        let stream: MediaStream | null = null;
        const abortController = new AbortController();

        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user',
                    },
                    audio: false,
                });

                // Check if component unmounted during getUserMedia
                if (abortController.signal.aborted) {
                    return;
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    try {
                        await videoRef.current.play();
                        setIsStreaming(true);
                        setError(null);
                    } catch (playErr) {
                        // Ignore AbortError from play() - normal cleanup behavior
                        if (
                            playErr instanceof DOMException
                            && playErr.name === 'AbortError'
                        ) {
                            return;
                        }
                        throw playErr;
                    }
                }
            } catch (err) {
                // Ignore AbortError - normal cleanup behavior when component unmounts
                if (err instanceof DOMException && err.name === 'AbortError') {
                    return;
                }

                console.error('[WebcamCapture] Failed to access camera:', err);
                setError('Camera access required for enrollment');
                setIsStreaming(false);
                onAccessDenied?.();
            }
        }

        startCamera();

        return () => {
            // Abort any pending operations first
            abortController.abort();

            // Then stop media tracks
            if (stream) {
                stream.getTracks().forEach((track) => {
                    track.stop();
                });
            }
        };
    }, [onAccessDenied]);

    // Capture and publish frames at target FPS
    useEffect(() => {
        if (!isStreaming) return;

        const intervalId = setInterval(() => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas (mirrored for selfie view)
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();

            // Convert to JPEG and publish
            canvas.toBlob(
                (blob) => {
                    if (!blob) return;

                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        if (!base64) return;

                        const now = Date.now();
                        publishImage({
                            header: {
                                stamp: {
                                    sec: Math.floor(now / 1000),
                                    nanosec: (now % 1000) * 1000000,
                                },
                                frame_id: 'webcam',
                            },
                            format: 'jpeg',
                            data: base64,
                        });

                        frameCountRef.current++;
                    };
                    reader.readAsDataURL(blob);
                },
                'image/jpeg',
                JPEG_QUALITY,
            );
        }, 1000 / TARGET_FPS);

        return () => clearInterval(intervalId);
    }, [isStreaming, publishImage]);

    return (
        <div
            ref={containerRef}
            className='relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden'
        >
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className='hidden' />

            {/* Video element (mirrored for selfie view) */}
            <video
                ref={videoRef}
                className='w-full h-full object-cover scale-x-[-1]'
                playsInline
                muted
            />

            {/* Error overlay */}
            {error && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/80'>
                    <div className='text-center p-4'>
                        <p className='text-red-400 text-lg mb-2'>{error}</p>
                        <p className='text-gray-400 text-sm'>
                            Please allow camera access and reload the page.
                        </p>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {!isStreaming && !error && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/80'>
                    <p className='text-gray-400'>Starting camera...</p>
                </div>
            )}

            {/* Overlays (scan effect, bounding box, etc.) */}
            {isStreaming && children}
        </div>
    );
}
