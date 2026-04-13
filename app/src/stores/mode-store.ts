/**
 * Mode store for managing robot operating mode.
 *
 * Provides:
 * - Current mode state (mapping/navigation)
 * - Mode switching via /map_manager/set_mode service
 * - Switching state and error handling
 */

import { create } from 'zustand';
import { createService, isConnected } from '@/lib/ros-client/index.ts';
import {
    RobotMode,
    type RobotModeType,
    type SetModeRequest,
    type SetModeResponse,
} from '@/types/ros-messages.ts';

export type SlamMode = 'mapping' | 'navigation';

interface ModeState {
    /** Current operating mode */
    currentMode: SlamMode;
    /** Whether mode switch is in progress */
    isSwitching: boolean;
    /** Error message from last failed switch */
    error: string | null;
    /** Whether retry is available (after error) */
    canRetry: boolean;
    /** Pending mode for retry */
    pendingMode: SlamMode | null;
}

interface ModeStore extends ModeState {
    /** Switch to a new mode */
    setMode: (mode: SlamMode) => Promise<boolean>;
    /** Retry the last failed mode switch */
    retry: () => Promise<boolean>;
    /** Clear error */
    clearError: () => void;
}

// Service client (created lazily)
let setModeService: ReturnType<
    typeof createService<SetModeRequest, SetModeResponse>
> | null = null;

function getSetModeService() {
    if (!setModeService) {
        setModeService = createService<SetModeRequest, SetModeResponse>(
            '/map_manager/set_mode',
            'slam_car_interfaces/srv/SetMode',
        );
    }
    return setModeService;
}

function slamModeToRobotMode(mode: SlamMode): RobotModeType {
    return mode === 'mapping' ? RobotMode.SLAM_MAPPING : RobotMode.NAVIGATION;
}

function robotModeToSlamMode(mode: number): SlamMode {
    return mode === RobotMode.NAVIGATION ? 'navigation' : 'mapping';
}

export const useModeStore = create<ModeStore>((set, get) => ({
    currentMode: 'mapping', // Default to mapping mode
    isSwitching: false,
    error: null,
    canRetry: false,
    pendingMode: null,

    setMode: async (mode: SlamMode) => {
        const state = get();

        if (mode === state.currentMode) {
            return true; // Already in this mode
        }

        if (!isConnected()) {
            set({
                error: 'Not connected to rosbridge',
                canRetry: true,
                pendingMode: mode,
            });
            return false;
        }

        set({
            isSwitching: true,
            error: null,
            canRetry: false,
            pendingMode: mode,
        });

        try {
            const service = getSetModeService();
            const robotMode = slamModeToRobotMode(mode);

            const response = await new Promise<SetModeResponse>(
                (resolve, reject) => {
                    service.callService(
                        { mode: robotMode },
                        (res: SetModeResponse) => resolve(res),
                        (err: string) => reject(new Error(err)),
                    );
                },
            );

            if (response.success) {
                const newMode = robotModeToSlamMode(response.current_mode);
                set({
                    currentMode: newMode,
                    isSwitching: false,
                    pendingMode: null,
                });
                return true;
            }
            set({
                error: response.message || 'Failed to switch mode',
                isSwitching: false,
                canRetry: true,
            });
            return false;
        } catch (err) {
            set({
                error:
                    err instanceof Error
                        ? err.message
                        : 'Failed to switch mode',
                isSwitching: false,
                canRetry: true,
            });
            return false;
        }
    },

    retry: async () => {
        const { pendingMode } = get();
        if (!pendingMode) {
            return false;
        }
        return get().setMode(pendingMode);
    },

    clearError: () =>
        set({
            error: null,
            canRetry: false,
            pendingMode: null,
        }),
}));
