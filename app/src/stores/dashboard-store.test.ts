/**
 * Tests for dashboard store.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDashboardStore } from '@/stores/dashboard-store.ts';

const initialState = {
    primaryMode: 'slam' as const,
    slamSubmode: 'mapping' as const,
    autoExplore: false,
    primaryViewport: 'map' as const,
    pipEnabled: true,
    pipPosition: 'top-right' as const,
    minimapEnabled: true,
    minimapViewMode: 'lidar' as const,
    rosError: null,
    cameraStreamEnabled: true,
    trackingEnabled: false,
    targetPerson: null,
    enrollModalOpen: false,
    manualOverride: false,
};

describe('useDashboardStore', () => {
    beforeEach(() => {
        useDashboardStore.setState(initialState);
    });

    afterEach(() => {
        useDashboardStore.setState(initialState);
    });

    describe('mode switching', () => {
        it('defaults to slam mode with tracking disabled', () => {
            const store = useDashboardStore.getState();
            expect(store.primaryMode).toBe('slam');
            expect(store.primaryViewport).toBe('map');
            expect(store.trackingEnabled).toBe(false);
            expect(store.manualOverride).toBe(false);
            expect(store.enrollModalOpen).toBe(false);
            expect(store.targetPerson).toBeNull();
        });

        it('switches tracking mode to camera viewport', () => {
            useDashboardStore.getState().setPrimaryMode('tracking');

            const store = useDashboardStore.getState();
            expect(store.primaryMode).toBe('tracking');
            expect(store.primaryViewport).toBe('camera');
        });

        it('switches slam mode to map viewport', () => {
            useDashboardStore.getState().setPrimaryMode('tracking');
            useDashboardStore.getState().setPrimaryMode('slam');

            const store = useDashboardStore.getState();
            expect(store.primaryMode).toBe('slam');
            expect(store.primaryViewport).toBe('map');
        });

        it('resets manual override when switching primary mode', () => {
            useDashboardStore.getState().setManualOverride(true);
            useDashboardStore.getState().setPrimaryMode('tracking');

            expect(useDashboardStore.getState().manualOverride).toBe(false);
        });

        it('switches slam submode', () => {
            useDashboardStore.getState().setSlamSubmode('navigation');

            expect(useDashboardStore.getState().slamSubmode).toBe('navigation');
        });

        it('resets auto explore when switching slam submode', () => {
            useDashboardStore.getState().setAutoExplore(true);
            useDashboardStore.getState().setSlamSubmode('navigation');

            expect(useDashboardStore.getState().autoExplore).toBe(false);
        });
    });

    describe('tracking controls', () => {
        it('enabling tracking disables manual override', () => {
            useDashboardStore.getState().setManualOverride(true);
            useDashboardStore.getState().setTrackingEnabled(true);

            const store = useDashboardStore.getState();
            expect(store.trackingEnabled).toBe(true);
            expect(store.manualOverride).toBe(false);
        });

        it('enabling manual override disables tracking', () => {
            useDashboardStore.getState().setTrackingEnabled(true);
            useDashboardStore.getState().setManualOverride(true);

            const store = useDashboardStore.getState();
            expect(store.manualOverride).toBe(true);
            expect(store.trackingEnabled).toBe(false);
        });

        it('sets target and modal state', () => {
            useDashboardStore.getState().setTargetPerson('person-1');
            useDashboardStore.getState().setEnrollModalOpen(true);

            const store = useDashboardStore.getState();
            expect(store.targetPerson).toBe('person-1');
            expect(store.enrollModalOpen).toBe(true);
        });
    });

    describe('viewport composition', () => {
        it('toggles PiP visibility', () => {
            useDashboardStore.getState().setPipEnabled(false);
            expect(useDashboardStore.getState().pipEnabled).toBe(false);

            useDashboardStore.getState().setPipEnabled(true);
            expect(useDashboardStore.getState().pipEnabled).toBe(true);
        });

        it('sets PiP position', () => {
            useDashboardStore.getState().setPipPosition('bottom-left');
            expect(useDashboardStore.getState().pipPosition).toBe(
                'bottom-left',
            );
        });

        it('toggles minimap view mode', () => {
            expect(useDashboardStore.getState().minimapViewMode).toBe('lidar');
            useDashboardStore.getState().toggleMinimapViewMode();
            expect(useDashboardStore.getState().minimapViewMode).toBe('map');
        });

        it('toggles minimap visibility and camera stream', () => {
            useDashboardStore.getState().setMinimapEnabled(false);
            useDashboardStore.getState().setCameraStreamEnabled(false);

            const store = useDashboardStore.getState();
            expect(store.minimapEnabled).toBe(false);
            expect(store.cameraStreamEnabled).toBe(false);
        });
    });

    describe('error handling', () => {
        it('sets and clears ROS errors', () => {
            useDashboardStore.getState().setRosError('Connection failed');
            expect(useDashboardStore.getState().rosError).toBe(
                'Connection failed',
            );

            useDashboardStore.getState().clearRosError();
            expect(useDashboardStore.getState().rosError).toBeNull();
        });
    });
});
