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
            primaryViewport: 'map',
            pipEnabled: true,
            pipPosition: 'top-right',
            minimapEnabled: true,
            rosError: null,
        });
    });

    afterEach(() => {
        useDashboardStore.setState({
            primaryMode: 'slam',
            slamSubmode: 'mapping',
            autoExplore: false,
            primaryViewport: 'map',
            pipEnabled: true,
            pipPosition: 'top-right',
            minimapEnabled: true,
            rosError: null,
        });
    });

    describe('mode switching', () => {
        it('should keep primary mode on slam', () => {
            const store = useDashboardStore.getState();
            expect(store.primaryMode).toBe('slam');

            store.setPrimaryMode('slam');

            const updatedStore = useDashboardStore.getState();
            expect(updatedStore.primaryMode).toBe('slam');
            expect(updatedStore.primaryViewport).toBe('map');
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
