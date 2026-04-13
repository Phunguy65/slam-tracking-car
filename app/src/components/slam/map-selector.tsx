/**
 * Map selector component for listing and loading saved maps.
 *
 * Fetches available maps from /map_manager/list_maps service
 * and loads selected map via /map_manager/load_map service.
 */
'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useMapStore } from '@/stores/map-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';

export function MapSelector() {
    const [selectedMap, setSelectedMap] = useState<string | null>(null);
    const status = useRosStore((s) => s.status);

    const {
        availableMaps,
        currentMap,
        isFetchingList,
        isLoadingMap,
        error,
        fetchMaps,
        loadMap,
        clearError,
    } = useMapStore();

    // Fetch maps when connected
    useEffect(() => {
        if (status === 'connected') {
            fetchMaps();
        }
    }, [status, fetchMaps]);

    const handleLoad = useCallback(async () => {
        if (!selectedMap) return;

        const success = await loadMap(selectedMap);
        if (success) {
            // Clear selection after successful load
            setSelectedMap(null);
        }
    }, [selectedMap, loadMap]);

    const handleRefresh = useCallback(() => {
        clearError();
        fetchMaps();
    }, [clearError, fetchMaps]);

    const isDisabled = status !== 'connected' || isFetchingList || isLoadingMap;
    const hasNoMaps = availableMaps.length === 0 && !isFetchingList;

    return (
        <div className='space-y-2'>
            {/* Map dropdown with refresh button */}
            <div className='flex gap-2'>
                <div className='flex-1'>
                    <label htmlFor='map-select' className='sr-only'>
                        Saved map
                    </label>
                    <select
                        id='map-select'
                        value={selectedMap ?? ''}
                        onChange={(e) => setSelectedMap(e.target.value || null)}
                        className='w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
                        disabled={isDisabled}
                        aria-label='Select a saved map'
                    >
                        {isFetchingList ? (
                            <option value=''>Loading maps...</option>
                        ) : hasNoMaps ? (
                            <option value=''>No maps available</option>
                        ) : (
                            <>
                                <option value=''>Select a map...</option>
                                {availableMaps.map((map) => (
                                    <option key={map} value={map}>
                                        {map}
                                        {map === currentMap ? ' (loaded)' : ''}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={isDisabled}
                    size='sm'
                    variant='ghost'
                    className='px-2'
                    title='Refresh map list'
                >
                    <RefreshCw
                        className={`size-4 ${isFetchingList ? 'animate-spin' : ''}`}
                    />
                    <span className='sr-only'>Refresh</span>
                </Button>
            </div>

            {/* Load button */}
            <Button
                onClick={handleLoad}
                disabled={isDisabled || !selectedMap}
                size='sm'
                variant='secondary'
                className='w-full'
            >
                {isLoadingMap ? (
                    <>
                        <Loader2 className='size-4 mr-2 animate-spin' />
                        Loading...
                    </>
                ) : (
                    'Load Map'
                )}
            </Button>

            {/* Status messages */}
            {error && (
                <p className='text-xs text-destructive' role='alert'>
                    {error}
                </p>
            )}
            {currentMap && !error && (
                <p className='text-xs text-muted-foreground'>
                    Current map: <span className='font-medium'>{currentMap}</span>
                </p>
            )}
            {!currentMap && !error && (
                <p className='text-xs text-muted-foreground'>
                    Select a map for navigation mode
                </p>
            )}
        </div>
    );
}
