import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersonOverlay } from '@/components/tracking/person-overlay.tsx';
import type { TrackedPersonArray } from '@/types/enrollment.ts';

let topicCallback: ((message: TrackedPersonArray) => void) | null = null;

vi.mock('@/hooks/use-topic.ts', () => ({
    useTopic: vi.fn((_topic, _type, callback) => {
        topicCallback = callback;
    }),
}));

const trackedPersons: TrackedPersonArray = {
    header: { stamp: { sec: 0, nanosec: 0 }, frame_id: 'camera' },
    persons: [
        {
            person_id: 'target',
            confidence: 0.9,
            is_target: true,
            body_bbox: {
                center_x: 0.5,
                center_y: 0.5,
                width: 0.2,
                height: 0.4,
            },
            face_bbox: {
                center_x: 0.5,
                center_y: 0.35,
                width: 0.1,
                height: 0.1,
            },
            face_visible: true,
            range_m: 1.24,
            bearing_rad: 0,
        },
        {
            person_id: 'unknown-range',
            confidence: 0.5,
            is_target: false,
            body_bbox: {
                center_x: 0.2,
                center_y: 0.5,
                width: 0.1,
                height: 0.2,
            },
            face_bbox: { center_x: 0, center_y: 0, width: 0, height: 0 },
            face_visible: false,
            range_m: Number.NaN,
            bearing_rad: 0,
        },
    ],
};

describe('PersonOverlay', () => {
    it('renders body and face boxes', () => {
        render(<PersonOverlay />);
        act(() => {
            topicCallback?.(trackedPersons);
        });

        expect(screen.getAllByTestId('body-bbox')).toHaveLength(2);
        expect(screen.getAllByTestId('face-bbox')).toHaveLength(1);
    });

    it('highlights target with orange stroke', () => {
        render(<PersonOverlay />);
        act(() => {
            topicCallback?.(trackedPersons);
        });

        expect(screen.getAllByTestId('body-bbox')[0]).toHaveAttribute(
            'stroke',
            '#fb923c',
        );
    });

    it('shows finite range and omits non-finite range', () => {
        render(<PersonOverlay />);
        act(() => {
            topicCallback?.(trackedPersons);
        });

        expect(screen.getByText('1.2 m')).toBeInTheDocument();
        expect(screen.queryByText('NaN m')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('range-label')).toHaveLength(1);
    });
});
