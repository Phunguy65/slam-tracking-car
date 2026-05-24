/**
 * Dashboard state store for unified operator workspace.
 *
 * Manages UI orchestration state for primary mode, SLAM submode, viewport
 * composition, PiP placement, and modal visibility. Does not duplicate
 * canonical ROS or mode state from domain stores.
 */
import { create } from 'zustand';

export type PrimaryMode = 'slam' | 'tracking';
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
    trackingEnabled: boolean;
    targetPerson: string | null;
    enrollModalOpen: boolean;
    manualOverride: boolean;
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
    setTrackingEnabled: (enabled: boolean) => void;
    setTargetPerson: (personId: string | null) => void;
    setEnrollModalOpen: (open: boolean) => void;
    setManualOverride: (enabled: boolean) => void;
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
        trackingEnabled: false,
        targetPerson: null,
        enrollModalOpen: false,
        manualOverride: false,

        setPrimaryMode: (mode) =>
            set(() => ({
                primaryMode: mode,
                primaryViewport: mode === 'tracking' ? 'camera' : 'map',
                manualOverride: false,
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

        setTrackingEnabled: (enabled) =>
            set((state) => ({
                trackingEnabled: enabled,
                manualOverride: enabled ? false : state.manualOverride,
            })),

        setTargetPerson: (personId) => set({ targetPerson: personId }),

        setEnrollModalOpen: (open) => set({ enrollModalOpen: open }),

        setManualOverride: (enabled) =>
            set((state) => ({
                manualOverride: enabled,
                trackingEnabled: enabled ? false : state.trackingEnabled,
            })),
    }),
);
