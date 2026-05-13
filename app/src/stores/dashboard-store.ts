/**
 * Dashboard state store for unified operator workspace.
 *
 * Manages UI orchestration state for primary mode, SLAM submode, viewport
 * composition, PiP placement, and modal visibility. Does not duplicate
 * canonical ROS or mode state from domain stores.
 */
import { create } from 'zustand';

export type PrimaryMode = 'slam';
export type SlamSubmode = 'mapping' | 'navigation';
export type PipPosition =
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left';
export type MinimapViewMode = 'lidar' | 'map';

interface DashboardState {
    primaryMode: PrimaryMode;
    slamSubmode: SlamSubmode;
    autoExplore: boolean;
    primaryViewport: 'map' | 'camera';
    pipEnabled: boolean;
    pipPosition: PipPosition;
    minimapEnabled: boolean;
    minimapViewMode: MinimapViewMode;
    rosError: string | null;
    cameraStreamEnabled: boolean;
}

interface DashboardActions {
    setPrimaryMode: (mode: PrimaryMode) => void;
    setSlamSubmode: (submode: SlamSubmode) => void;
    setAutoExplore: (enabled: boolean) => void;
    setPipEnabled: (enabled: boolean) => void;
    setPipPosition: (position: PipPosition) => void;
    setMinimapEnabled: (enabled: boolean) => void;
    setMinimapViewMode: (mode: MinimapViewMode) => void;
    toggleMinimapViewMode: () => void;
    setRosError: (error: string | null) => void;
    clearRosError: () => void;
    setCameraStreamEnabled: (enabled: boolean) => void;
}

export const useDashboardStore = create<DashboardState & DashboardActions>(
    (set) => ({
        primaryMode: 'slam',
        slamSubmode: 'mapping',
        autoExplore: false,
        primaryViewport: 'map',
        pipEnabled: true,
        pipPosition: 'top-right',
        minimapEnabled: true,
        minimapViewMode: 'lidar',
        rosError: null,
        cameraStreamEnabled: true,

        setPrimaryMode: (mode) =>
            set(() => ({
                primaryMode: mode,
                primaryViewport: 'map',
            })),

        setSlamSubmode: (submode) =>
            set({
                slamSubmode: submode,
                autoExplore: false,
            }),

        setAutoExplore: (enabled) => set({ autoExplore: enabled }),

        setPipEnabled: (enabled) => set({ pipEnabled: enabled }),

        setPipPosition: (position) => set({ pipPosition: position }),

        setMinimapEnabled: (enabled) => set({ minimapEnabled: enabled }),

        setMinimapViewMode: (mode) => set({ minimapViewMode: mode }),

        toggleMinimapViewMode: () =>
            set((state) => ({
                minimapViewMode:
                    state.minimapViewMode === 'lidar' ? 'map' : 'lidar',
            })),

        setRosError: (error) => set({ rosError: error }),

        clearRosError: () => set({ rosError: null }),

        setCameraStreamEnabled: (enabled) =>
            set({ cameraStreamEnabled: enabled }),
    }),
);
