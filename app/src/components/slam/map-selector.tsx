/**
 * Map selector component for listing and loading saved maps.
 *
 * Note: This is a placeholder - full implementation would require
 * a service to list available maps from the filesystem.
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useRosStore } from '@/stores/ros-store.ts';

// Placeholder maps - in production, these would come from a service
const PLACEHOLDER_MAPS = ['living_room', 'office_floor1', 'warehouse_a'];

export function MapSelector() {
    const [selectedMap, setSelectedMap] = useState<string | null>(null);
    const status = useRosStore((s) => s.status);

    const handleLoad = () => {
        if (!selectedMap) return;

        // In production, this would call a service to load the map
        console.log('[MapSelector] Loading map:', selectedMap);

        // TODO: Implement map loading via Nav2 map_server or slam_toolbox
    };

    return (
        <div className='space-y-2'>
            <label htmlFor='map-select' className='sr-only'>
                Saved map
            </label>
            <select
                id='map-select'
                value={selectedMap ?? ''}
                onChange={(e) => setSelectedMap(e.target.value || null)}
                className='w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                disabled={status !== 'connected'}
                aria-label='Select a saved map'
            >
                <option value=''>Select a saved map...</option>
                {PLACEHOLDER_MAPS.map((map) => (
                    <option key={map} value={map}>
                        {map}
                    </option>
                ))}
            </select>
            <Button
                onClick={handleLoad}
                disabled={status !== 'connected' || !selectedMap}
                size='sm'
                variant='secondary'
                className='w-full'
            >
                Load Map
            </Button>
            <p className='text-xs text-muted-foreground'>
                Maps are loaded for navigation mode
            </p>
        </div>
    );
}
