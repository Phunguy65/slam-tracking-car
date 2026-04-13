/**
 * Save map button component.
 */
'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useService } from '@/hooks/use-service.ts';
import { useRosStore } from '@/stores/ros-store.ts';

export function SaveMapButton() {
    const [mapName, setMapName] = useState('');
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const status = useRosStore((s) => s.status);

    const { call: saveMap } = useService<
        { name: { data: string } },
        { result: number }
    >('/slam_toolbox/save_map', 'slam_toolbox/SaveMap');

    const handleSave = useCallback(async () => {
        const name = mapName.trim() || `map_${Date.now()}`;
        setSaving(true);
        setLastSaved(null);

        try {
            const response = await saveMap({ name: { data: name } });
            if (response.result === 0) {
                setLastSaved(name);
                setMapName('');
            } else {
                console.error(
                    '[SaveMapButton] Save failed with result:',
                    response.result,
                );
            }
        } catch (err) {
            console.error('[SaveMapButton] Save error:', err);
        } finally {
            setSaving(false);
        }
    }, [mapName, saveMap]);

    return (
        <div className='space-y-2'>
            <div className='flex gap-2'>
                <label htmlFor='map-name-input' className='sr-only'>
                    Map name
                </label>
                <input
                    id='map-name-input'
                    type='text'
                    placeholder='Map name (optional)'
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    className='flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    disabled={status !== 'connected' || saving}
                    aria-label='Map name'
                />
                <Button
                    onClick={handleSave}
                    disabled={status !== 'connected' || saving}
                    size='sm'
                >
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
            {lastSaved && (
                <p className='text-xs text-success'>Saved: {lastSaved}</p>
            )}
        </div>
    );
}
