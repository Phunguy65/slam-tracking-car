/**
 * Primary viewport component for dashboard main content area.
 *
 * Renders the occupancy map for the SLAM dashboard viewport.
 */
'use client';

import type { MinimapViewMode, SlamSubmode } from '@/stores/dashboard-store.ts';
import { SlamViewport } from './slam-viewport.tsx';

interface PrimaryViewportProps {
    slamSubmode: SlamSubmode;
    minimapViewMode: MinimapViewMode;
}

export function PrimaryViewport({
    slamSubmode,
    minimapViewMode,
}: PrimaryViewportProps) {
    return (
        <SlamViewport submode={slamSubmode} minimapViewMode={minimapViewMode} />
    );
}
