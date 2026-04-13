/**
 * Map store for managing available maps and loading state.
 *
 * Provides:
 * - List of available maps from /map_manager/list_maps
 * - Load map functionality via /map_manager/load_map
 * - Loading states and error handling
 */

import { create } from 'zustand';
import { createService, isConnected } from '@/lib/ros-client/index.ts';
import type {
    ListMapsRequest,
    ListMapsResponse,
    LoadMapRequest,
    LoadMapResponse,
} from '@/types/ros-messages.ts';

interface MapState {
    /** Available maps from the maps directory */
    availableMaps: string[];
    /** Currently loaded map name */
    currentMap: string | null;
    /** Whether we're fetching the map list */
    isFetchingList: boolean;
    /** Whether we're loading a map */
    isLoadingMap: boolean;
    /** Error message */
    error: string | null;
}

interface MapStore extends MapState {
    /** Fetch available maps from map_manager */
    fetchMaps: () => Promise<void>;
    /** Load a map by name */
    loadMap: (mapName: string) => Promise<boolean>;
    /** Clear error */
    clearError: () => void;
}

// Service clients (created lazily)
let listMapsService: ReturnType<
    typeof createService<ListMapsRequest, ListMapsResponse>
> | null = null;
let loadMapService: ReturnType<
    typeof createService<LoadMapRequest, LoadMapResponse>
> | null = null;

function getListMapsService() {
    if (!listMapsService) {
        listMapsService = createService<ListMapsRequest, ListMapsResponse>(
            '/map_manager/list_maps',
            'slam_car_interfaces/srv/ListMaps',
        );
    }
    return listMapsService;
}

function getLoadMapService() {
    if (!loadMapService) {
        loadMapService = createService<LoadMapRequest, LoadMapResponse>(
            '/map_manager/load_map',
            'slam_car_interfaces/srv/LoadMap',
        );
    }
    return loadMapService;
}

export const useMapStore = create<MapStore>((set, get) => ({
    availableMaps: [],
    currentMap: null,
    isFetchingList: false,
    isLoadingMap: false,
    error: null,

    fetchMaps: async () => {
        if (!isConnected()) {
            set({ error: 'Not connected to rosbridge' });
            return;
        }

        set({ isFetchingList: true, error: null });

        try {
            const service = getListMapsService();

            const response = await new Promise<ListMapsResponse>(
                (resolve, reject) => {
                    service.callService(
                        {} as ListMapsRequest,
                        (res: ListMapsResponse) => resolve(res),
                        (err: string) => reject(new Error(err)),
                    );
                },
            );

            if (response.success) {
                set({
                    availableMaps: response.maps,
                    isFetchingList: false,
                });
            } else {
                set({
                    error: response.message || 'Failed to fetch maps',
                    isFetchingList: false,
                });
            }
        } catch (err) {
            set({
                error:
                    err instanceof Error ? err.message : 'Failed to fetch maps',
                isFetchingList: false,
            });
        }
    },

    loadMap: async (mapName: string) => {
        if (!isConnected()) {
            set({ error: 'Not connected to rosbridge' });
            return false;
        }

        set({ isLoadingMap: true, error: null });

        try {
            const service = getLoadMapService();

            const response = await new Promise<LoadMapResponse>(
                (resolve, reject) => {
                    service.callService(
                        { map_name: mapName },
                        (res: LoadMapResponse) => resolve(res),
                        (err: string) => reject(new Error(err)),
                    );
                },
            );

            if (response.success) {
                set({
                    currentMap: mapName,
                    isLoadingMap: false,
                });
                return true;
            }
            set({
                error: response.message || 'Failed to load map',
                isLoadingMap: false,
            });
            return false;
        } catch (err) {
            set({
                error:
                    err instanceof Error ? err.message : 'Failed to load map',
                isLoadingMap: false,
            });
            return false;
        }
    },

    clearError: () => set({ error: null }),
}));
