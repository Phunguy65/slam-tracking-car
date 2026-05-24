import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackingPanels } from '@/components/dashboard/tracking-panels.tsx';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useEnrollmentStore } from '@/stores/enrollment-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';

vi.mock('@/hooks/use-topic.ts', () => ({
    useTopic: vi.fn(),
    usePublisher: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/tracking/pid-tuner.tsx', () => ({
    PidTuner: () => null,
}));

vi.mock('@/components/viewport/viewport-switcher.tsx', () => ({
    ViewportSwitcher: () => null,
}));

vi.mock('@/components/dashboard/enroll-modal.tsx', () => ({
    EnrollModal: () => null,
}));

function resetStores() {
    useRosStore.setState({ status: 'connected', error: null });
    useDashboardStore.setState({
        primaryMode: 'tracking',
        trackingEnabled: false,
        manualOverride: false,
        targetPerson: null,
        enrollModalOpen: false,
    });
    useEnrollmentStore.setState({
        persons: [],
        isLoading: false,
        error: null,
        targetId: null,
    });
}

describe('TrackingPanels target states', () => {
    beforeEach(() => {
        resetStores();
    });

    it('renders disconnected state when rosbridge is offline', () => {
        useRosStore.setState({ status: 'disconnected', error: null });

        render(<TrackingPanels />);

        expect(
            screen.getByTestId('target-panel-disconnected'),
        ).toBeInTheDocument();
    });

    it('renders error state with retry that clears the store error', () => {
        useEnrollmentStore.setState({
            persons: [],
            isLoading: false,
            error: 'Service unreachable',
            targetId: null,
        });

        render(<TrackingPanels />);

        const errorPanel = screen.getByTestId('target-panel-error');
        expect(errorPanel).toBeInTheDocument();
        expect(screen.getByText('Service unreachable')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

        expect(useEnrollmentStore.getState().error).toBeNull();
    });

    it('renders loading state while enrollment store is loading', () => {
        useEnrollmentStore.setState({
            persons: [],
            isLoading: true,
            error: null,
            targetId: null,
        });

        render(<TrackingPanels />);

        expect(screen.getByTestId('target-panel-loading')).toBeInTheDocument();
    });

    it('renders empty state with Add person CTA when no one enrolled', () => {
        render(<TrackingPanels />);

        const emptyPanel = screen.getByTestId('target-panel-empty');
        expect(emptyPanel).toBeInTheDocument();

        const addButton = screen.getByRole('button', { name: /Add person/ });
        fireEvent.click(addButton);

        expect(useDashboardStore.getState().enrollModalOpen).toBe(true);
    });

    it('renders active state with current target name when persons exist', () => {
        useEnrollmentStore.setState({
            persons: [
                {
                    person_id: 'person-1',
                    name: 'Ada',
                    thumbnail_base64: '',
                    created_at: '2026-05-21T00:00:00Z',
                },
            ],
            isLoading: false,
            error: null,
            targetId: 'person-1',
        });
        useDashboardStore.setState({ targetPerson: 'person-1' });

        render(<TrackingPanels />);

        expect(screen.getByTestId('target-panel-active')).toBeInTheDocument();
        expect(screen.getByText('Ada')).toBeInTheDocument();
    });

    it('disables tracking and override switches while disconnected', () => {
        useRosStore.setState({ status: 'disconnected', error: null });

        const { container } = render(<TrackingPanels />);

        const trackingInput = container.querySelector(
            'input#tracking-toggle-dash',
        ) as HTMLInputElement | null;
        const overrideInput = container.querySelector(
            'input#manual-override-toggle',
        ) as HTMLInputElement | null;

        expect(trackingInput?.disabled).toBe(true);
        expect(overrideInput?.disabled).toBe(true);
    });
});
