/**
 * Primary viewport component for dashboard main content area.
 *
 * Renders occupancy map (SLAM) or camera stream (Tracking) based on mode.
 * Includes loading, error, and no-signal placeholder states.
 */
'use client';

import { CameraStream } from '@/components/tracking/camera-stream.tsx';
import { PersonOverlay } from '@/components/tracking/person-overlay.tsx';
import type { PrimaryMode, SlamSubmode } from '@/stores/dashboard-store.ts';
import { SlamViewport } from './slam-viewport.tsx';

interface PrimaryViewportProps {
    mode: PrimaryMode;
    slamSubmode: SlamSubmode;
}

export function PrimaryViewport({ mode, slamSubmode }: PrimaryViewportProps) {
    if (mode === 'slam') {
        return <SlamViewport submode={slamSubmode} />;
    }

    return (
        <div className='absolute inset-0 bg-black'>
            <CameraStream />
            <PersonOverlay />
        </div>
    );
}
