/**
 * Tests for dashboard store.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDashboardStore } from '@/stores/dashboard-store.ts';

describe('useDashboardStore', () => {
    beforeEach(() => {
        useDashboardStore.setState({
            primaryMode: 'slam',
            slamSubmode: 'mapping',
            autoExplore: false,
            trackingEnabled: false,
            targetPerson: null,
            primaryViewport: 'map',
            pipEnabled: true,
            pipPosition: 'top-right',
            minimapEnabled: true,
            enrollModalOpen: false,
            manualOverride: false,
            rosError: null,
        });
    });

    afterEach(() => {
        useDashboardStore.setState({
            primaryMode: 'slam',
            slamSubmode: 'mapping',
            autoExplore: false,
            trackingEnabled: false,
            targetPerson: null,
            primaryViewport: 'map',
            pipEnabled: true,
            pipPosition: 'top-right',
            minimapEnabled: true,
            enrollModalOpen: false,
            manualOverride: false,
            rosError: null,
        });
    });

    describe('mode switching', () => {
        it('should switch primary mode from slam to tracking', () => {
            const store = useDashboardStore.getState();
            expect(store.primaryMode).toBe('slam');

            store.setPrimaryMode('tracking');

            const updatedStore = useDashboardStore.getState();
            expect(updatedStore.primaryMode).toBe('tracking');
            expect(updatedStore.primaryViewport).toBe('camera');
        });

        it('should switch primary mode from tracking to slam', () => {
            useDashboardStore.getState().setPrimaryMode('tracking');
            useDashboardStore.getState().setPrimaryMode('slam');

            const store = useDashboardStore.getState();
            expect(store.primaryMode).toBe('slam');
            expect(store.primaryViewport).toBe('map');
        });

        it('should reset manual override when switching modes', () => {
            useDashboardStore.getState().setManualOverride(true);
            useDashboardStore.getState().setPrimaryMode('slam');

            expect(useDashboardStore.getState().manualOverride).toBe(false);
        });

        it('should switch slam submode', () => {
            const store = useDashboardStore.getState();
            expect(store.slamSubmode).toBe('mapping');

            store.setSlamSubmode('navigation');

            expect(useDashboardStore.getState().slamSubmode).toBe('navigation');
        });

        it('should reset auto explore when switching slam submode', () => {
            useDashboardStore.getState().setAutoExplore(true);
            useDashboardStore.getState().setSlamSubmode('navigation');

            expect(useDashboardStore.getState().autoExplore).toBe(false);
        });
    });

    describe('viewport composition', () => {
        it('should toggle PiP visibility', () => {
            expect(useDashboardStore.getState().pipEnabled).toBe(true);

            useDashboardStore.getState().setPipEnabled(false);
            expect(useDashboardStore.getState().pipEnabled).toBe(false);

            useDashboardStore.getState().setPipEnabled(true);
            expect(useDashboardStore.getState().pipEnabled).toBe(true);
        });

        it('should cycle PiP position', () => {
            expect(useDashboardStore.getState().pipPosition).toBe('top-right');

            useDashboardStore.getState().setPipPosition('top-left');
            expect(useDashboardStore.getState().pipPosition).toBe('top-left');

            useDashboardStore.getState().setPipPosition('bottom-left');
            expect(useDashboardStore.getState().pipPosition).toBe(
                'bottom-left',
            );
        });

        it('should toggle minimap visibility', () => {
            expect(useDashboardStore.getState().minimapEnabled).toBe(true);

            useDashboardStore.getState().setMinimapEnabled(false);
            expect(useDashboardStore.getState().minimapEnabled).toBe(false);
        });
    });

    describe('control gating', () => {
        it('should disable tracking when enabling manual override', () => {
            useDashboardStore.getState().setTrackingEnabled(true);
            expect(useDashboardStore.getState().trackingEnabled).toBe(true);

            useDashboardStore.getState().setManualOverride(true);
            expect(useDashboardStore.getState().manualOverride).toBe(true);
            expect(useDashboardStore.getState().trackingEnabled).toBe(false);
        });
    });

    describe('enrollment modal', () => {
        it('should open and close enrollment modal', () => {
            expect(useDashboardStore.getState().enrollModalOpen).toBe(false);

            useDashboardStore.getState().setEnrollModalOpen(true);
            expect(useDashboardStore.getState().enrollModalOpen).toBe(true);

            useDashboardStore.getState().setEnrollModalOpen(false);
            expect(useDashboardStore.getState().enrollModalOpen).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should set and clear ROS errors', () => {
            expect(useDashboardStore.getState().rosError).toBeNull();

            useDashboardStore.getState().setRosError('Connection failed');
            expect(useDashboardStore.getState().rosError).toBe(
                'Connection failed',
            );

            useDashboardStore.getState().clearRosError();
            expect(useDashboardStore.getState().rosError).toBeNull();
        });
    });
});
