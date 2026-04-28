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
    trackingEnabled: boolean;
    targetPerson: string | null;
    primaryViewport: 'map' | 'camera';
    pipEnabled: boolean;
    pipPosition: PipPosition;
    minimapEnabled: boolean;
    minimapViewMode: MinimapViewMode;
    enrollModalOpen: boolean;
    manualOverride: boolean;
    rosError: string | null;
    cameraStreamEnabled: boolean;
}

interface DashboardActions {
    setPrimaryMode: (mode: PrimaryMode) => void;
    setSlamSubmode: (submode: SlamSubmode) => void;
    setAutoExplore: (enabled: boolean) => void;
    setTrackingEnabled: (enabled: boolean) => void;
    setTargetPerson: (personId: string | null) => void;
    setPipEnabled: (enabled: boolean) => void;
    setPipPosition: (position: PipPosition) => void;
    setMinimapEnabled: (enabled: boolean) => void;
    setMinimapViewMode: (mode: MinimapViewMode) => void;
    toggleMinimapViewMode: () => void;
    setEnrollModalOpen: (open: boolean) => void;
    setManualOverride: (override: boolean) => void;
    setRosError: (error: string | null) => void;
    clearRosError: () => void;
    setCameraStreamEnabled: (enabled: boolean) => void;
}

export const useDashboardStore = create<DashboardState & DashboardActions>(
    (set) => ({
        primaryMode: 'slam',
        slamSubmode: 'mapping',
        autoExplore: false,
        trackingEnabled: false,
        targetPerson: null,
        primaryViewport: 'map',
        pipEnabled: true,
        pipPosition: 'top-right',
        minimapEnabled: true,
        minimapViewMode: 'lidar',
        enrollModalOpen: false,
        manualOverride: false,
        rosError: null,
        cameraStreamEnabled: true,

        setPrimaryMode: (mode) =>
            set(() => ({
                primaryMode: mode,
                primaryViewport: mode === 'slam' ? 'map' : 'camera',
                manualOverride: false,
            })),

        setSlamSubmode: (submode) =>
            set({
                slamSubmode: submode,
                autoExplore: false,
            }),

        setAutoExplore: (enabled) => set({ autoExplore: enabled }),

        setTrackingEnabled: (enabled) =>
            set({
                trackingEnabled: enabled,
                manualOverride: enabled ? false : undefined,
            }),

        setTargetPerson: (personId) => set({ targetPerson: personId }),

        setPipEnabled: (enabled) => set({ pipEnabled: enabled }),

        setPipPosition: (position) => set({ pipPosition: position }),

        setMinimapEnabled: (enabled) => set({ minimapEnabled: enabled }),

        setMinimapViewMode: (mode) => set({ minimapViewMode: mode }),

        toggleMinimapViewMode: () =>
            set((state) => ({
                minimapViewMode:
                    state.minimapViewMode === 'lidar' ? 'map' : 'lidar',
            })),

        setEnrollModalOpen: (open) => set({ enrollModalOpen: open }),

        setManualOverride: (override) =>
            set({
                manualOverride: override,
                trackingEnabled: override ? false : undefined,
            }),

        setRosError: (error) => set({ rosError: error }),

        clearRosError: () => set({ rosError: null }),

        setCameraStreamEnabled: (enabled) =>
            set({ cameraStreamEnabled: enabled }),
    }),
);
