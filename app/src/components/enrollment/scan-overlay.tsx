/**
 * Scan overlay component for enrollment UI.
 *
 * Shows animated scan line, corner brackets, and progress indicator
 * based on enrollment status.
 */
'use client';

import { useEffect, useState } from 'react';
import {
    type BoundingBox2D,
    EnrollmentStatusType,
} from '@/types/enrollment.ts';

interface ScanOverlayProps {
    status: number;
    faceBbox: BoundingBox2D | null;
    progress: number;
}

export function ScanOverlay({ status, faceBbox, progress }: ScanOverlayProps) {
    const [scanPosition, setScanPosition] = useState(0);
    const [showVerified, setShowVerified] = useState(false);

    // Animate scan line during SCANNING
    useEffect(() => {
        if (status !== EnrollmentStatusType.SCANNING) {
            setScanPosition(0);
            return;
        }

        const interval = setInterval(() => {
            setScanPosition((prev) => (prev + 2) % 100);
        }, 30);

        return () => clearInterval(interval);
    }, [status]);

    // Show "VERIFIED" briefly when READY
    useEffect(() => {
        if (status === EnrollmentStatusType.READY) {
            setShowVerified(true);
            const timeout = setTimeout(() => setShowVerified(false), 1500);
            return () => clearTimeout(timeout);
        }
    }, [status]);

    if (
        !faceBbox
        || status === EnrollmentStatusType.IDLE
        || status === EnrollmentStatusType.NO_FACE
    ) {
        return null;
    }

    // Convert normalized bbox to percentage
    const left = (faceBbox.center_x - faceBbox.width / 2) * 100;
    const top = (faceBbox.center_y - faceBbox.height / 2) * 100;
    const width = faceBbox.width * 100;
    const height = faceBbox.height * 100;

    // Colors based on status
    const isReady = status === EnrollmentStatusType.READY;
    const borderColor = isReady ? 'border-green-400' : 'border-cyan-400';
    const glowColor = isReady ? 'shadow-green-400/50' : 'shadow-cyan-400/50';
    const textColor = isReady ? 'text-green-400' : 'text-cyan-400';

    return (
        <div className='absolute inset-0 pointer-events-none'>
            {/* Face bounding box with corners */}
            <div
                className='absolute'
                style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                }}
            >
                {/* Corner brackets */}
                <div
                    className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 ${borderColor} shadow-lg ${glowColor}`}
                />
                <div
                    className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 ${borderColor} shadow-lg ${glowColor}`}
                />
                <div
                    className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 ${borderColor} shadow-lg ${glowColor}`}
                />
                <div
                    className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 ${borderColor} shadow-lg ${glowColor}`}
                />

                {/* Scan line (during SCANNING) */}
                {status === EnrollmentStatusType.SCANNING && (
                    <div
                        className='absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50'
                        style={{ top: `${scanPosition}%` }}
                    />
                )}

                {/* Verified checkmark */}
                {showVerified && (
                    <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-lg'>
                            <span
                                className={`${textColor} font-bold text-lg flex items-center gap-2`}
                            >
                                <svg
                                    className='w-6 h-6'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'
                                    aria-hidden='true'
                                    focusable='false'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M5 13l4 4L19 7'
                                    />
                                </svg>
                                VERIFIED
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Progress bar (during SCANNING) */}
            {status === EnrollmentStatusType.SCANNING && (
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 w-48'>
                    <div className='h-1 bg-gray-700 rounded-full overflow-hidden'>
                        <div
                            className='h-full bg-cyan-400 transition-all duration-100'
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <p className='text-center text-cyan-400 text-sm mt-1'>
                        Scanning... {Math.round(progress * 100)}%
                    </p>
                </div>
            )}
        </div>
    );
}
