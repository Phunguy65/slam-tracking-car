/**
 * Tests for viewport composition rules.
 */
import { describe, expect, it } from 'vitest';

type PrimaryMode = 'slam' | 'tracking';
type SlamSubmode = 'mapping' | 'navigation';

interface ViewportConfig {
    primaryContent: 'map' | 'camera';
    secondaryContent: 'camera-pip' | 'minimap' | null;
}

function getViewportConfig(
    primaryMode: PrimaryMode,
    _slamSubmode: SlamSubmode,
    pipEnabled: boolean,
    minimapEnabled: boolean,
): ViewportConfig {
    if (primaryMode === 'slam') {
        return {
            primaryContent: 'map',
            secondaryContent: pipEnabled ? 'camera-pip' : null,
        };
    }

    return {
        primaryContent: 'camera',
        secondaryContent: minimapEnabled ? 'minimap' : null,
    };
}

describe('Viewport Composition', () => {
    describe('SLAM mode viewports', () => {
        it('should show map primary with camera PiP in SLAM mapping', () => {
            const config = getViewportConfig('slam', 'mapping', true, true);
            expect(config.primaryContent).toBe('map');
            expect(config.secondaryContent).toBe('camera-pip');
        });

        it('should show map primary with camera PiP in SLAM navigation', () => {
            const config = getViewportConfig('slam', 'navigation', true, true);
            expect(config.primaryContent).toBe('map');
            expect(config.secondaryContent).toBe('camera-pip');
        });

        it('should show map primary without PiP when disabled', () => {
            const config = getViewportConfig('slam', 'mapping', false, true);
            expect(config.primaryContent).toBe('map');
            expect(config.secondaryContent).toBeNull();
        });
    });

    describe('Tracking mode viewports', () => {
        it('should show camera primary with minimap in tracking', () => {
            const config = getViewportConfig('tracking', 'mapping', true, true);
            expect(config.primaryContent).toBe('camera');
            expect(config.secondaryContent).toBe('minimap');
        });

        it('should show camera primary without minimap when disabled', () => {
            const config = getViewportConfig(
                'tracking',
                'mapping',
                true,
                false,
            );
            expect(config.primaryContent).toBe('camera');
            expect(config.secondaryContent).toBeNull();
        });
    });
});
