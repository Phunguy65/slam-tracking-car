/**
 * Primary viewport component for dashboard main content area.
 */
'use client';

import { CameraStream } from '@/components/tracking/camera-stream.tsx';
import { PersonOverlay } from '@/components/tracking/person-overlay.tsx';
import type {
    MinimapViewMode,
    PrimaryMode,
    SlamSubmode,
} from '@/stores/dashboard-store.ts';
import { SlamViewport } from './slam-viewport.tsx';

interface PrimaryViewportProps {
    mode: PrimaryMode;
    slamSubmode: SlamSubmode;
    minimapViewMode: MinimapViewMode;
}

export function PrimaryViewport({
    mode,
    slamSubmode,
    minimapViewMode,
}: PrimaryViewportProps) {
    if (mode === 'tracking') {
        return (
            <div className='absolute inset-0 bg-black'>
                <CameraStream />
                <PersonOverlay />
            </div>
        );
    }

    return (
        <SlamViewport submode={slamSubmode} minimapViewMode={minimapViewMode} />
    );
}
