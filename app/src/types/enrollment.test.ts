import { describe, expect, it } from 'vitest';
import { parseTrackingControllerStatus } from '@/types/enrollment.ts';

describe('parseTrackingControllerStatus', () => {
    it('parses a valid payload', () => {
        expect(
            parseTrackingControllerStatus(
                JSON.stringify({
                    state: 'tracking',
                    target_id: 'person-1',
                    range_m: 1.25,
                    obstacle: false,
                }),
            ),
        ).toEqual({
            state: 'tracking',
            target_id: 'person-1',
            range_m: 1.25,
            obstacle: false,
        });
    });

    it('returns null for malformed JSON', () => {
        expect(parseTrackingControllerStatus('{bad json')).toBeNull();
    });

    it('returns null for missing fields', () => {
        expect(
            parseTrackingControllerStatus(
                JSON.stringify({ state: 'tracking', target_id: 'person-1' }),
            ),
        ).toBeNull();
    });

    it('keeps null range', () => {
        expect(
            parseTrackingControllerStatus(
                JSON.stringify({
                    state: 'searching',
                    target_id: '',
                    range_m: null,
                    obstacle: false,
                }),
            )?.range_m,
        ).toBeNull();
    });

    it('keeps finite range', () => {
        expect(
            parseTrackingControllerStatus(
                JSON.stringify({
                    state: 'tracking',
                    target_id: 'person-1',
                    range_m: 2.5,
                    obstacle: true,
                }),
            )?.range_m,
        ).toBe(2.5);
    });
});
