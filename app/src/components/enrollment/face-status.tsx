/**
 * Face status display bar for enrollment UI.
 *
 * Shows current enrollment status with appropriate styling.
 */
'use client';

import {
    EnrollmentStatusType,
    getStatusColor,
    getStatusLabel,
} from '@/types/enrollment.ts';

interface FaceStatusProps {
    status: number | null;
}

export function FaceStatus({ status }: FaceStatusProps) {
    const statusValue = status ?? EnrollmentStatusType.IDLE;
    const label = getStatusLabel(statusValue as EnrollmentStatusType);
    const colorClass = getStatusColor(statusValue as EnrollmentStatusType);

    // Icon based on status
    const Icon = () => {
        switch (statusValue) {
            case EnrollmentStatusType.IDLE:
                return (
                    <svg
                        className='w-5 h-5'
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
                            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                        />
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                        />
                    </svg>
                );
            case EnrollmentStatusType.FACE_DETECTED:
            case EnrollmentStatusType.SCANNING:
                return (
                    <svg
                        className='w-5 h-5 animate-pulse'
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
                            d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                        />
                    </svg>
                );
            case EnrollmentStatusType.READY:
                return (
                    <svg
                        className='w-5 h-5'
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
                            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                    </svg>
                );
            case EnrollmentStatusType.NO_FACE:
                return (
                    <svg
                        className='w-5 h-5'
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
                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 backdrop-blur-sm ${colorClass}`}
        >
            <Icon />
            <span className='font-medium'>{label}</span>
        </div>
    );
}
