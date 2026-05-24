import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackingStatus } from '@/components/tracking/tracking-status.tsx';
import { useEnrollmentStore } from '@/stores/enrollment-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';

let topicCallback: ((message: { data: string }) => void) | null = null;

vi.mock('@/hooks/use-topic.ts', () => ({
    useTopic: vi.fn((_topic, _type, callback) => {
        topicCallback = callback;
    }),
}));

describe('TrackingStatus', () => {
    beforeEach(() => {
        topicCallback = null;
        useRosStore.setState({ status: 'connected', error: null });
        useEnrollmentStore.setState({
            persons: [
                {
                    person_id: 'person-1',
                    name: 'Ada',
                    thumbnail_base64: '',
                    created_at: '2026-05-21T00:00:00Z',
                },
            ],
        });
    });

    it('renders loading when connected but no message yet', () => {
        render(<TrackingStatus />);

        expect(
            screen.getByTestId('tracking-status-loading'),
        ).toBeInTheDocument();
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders disconnected when rosbridge is offline', () => {
        useRosStore.setState({ status: 'disconnected', error: null });
        render(<TrackingStatus />);

        expect(
            screen.getByTestId('tracking-status-disconnected'),
        ).toBeInTheDocument();
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('renders parsed status with finite range and resolved target name', () => {
        render(<TrackingStatus />);
        act(() => {
            topicCallback?.({
                data: JSON.stringify({
                    state: 'tracking',
                    target_id: 'person-1',
                    range_m: 1.23,
                    obstacle: false,
                }),
            });
        });

        expect(screen.getByText('tracking')).toBeInTheDocument();
        expect(screen.getByText('Ada')).toBeInTheDocument();
        expect(screen.getByText('1.2 m')).toBeInTheDocument();
    });

    it('renders unavailable on parse failure', () => {
        render(<TrackingStatus />);
        act(() => {
            topicCallback?.({ data: '{bad json' });
        });

        expect(screen.getByText('Status: unavailable')).toBeInTheDocument();
    });

    it('renders unknown range marker for null range', () => {
        render(<TrackingStatus />);
        act(() => {
            topicCallback?.({
                data: JSON.stringify({
                    state: 'searching',
                    target_id: '',
                    range_m: null,
                    obstacle: false,
                }),
            });
        });

        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('renders obstacle badge', () => {
        render(<TrackingStatus />);
        act(() => {
            topicCallback?.({
                data: JSON.stringify({
                    state: 'blocked',
                    target_id: 'person-1',
                    range_m: 1,
                    obstacle: true,
                }),
            });
        });

        expect(screen.getByText('Obstacle')).toBeInTheDocument();
    });
});
