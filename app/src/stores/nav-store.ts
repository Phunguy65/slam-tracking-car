/**
 * Navigation store for shared action state.
 *
 * Provides singleton state for NavigateToPose action so that
 * GoalSetter and NavigationStatus share the same state.
 */

import { create } from 'zustand';
import { createAction, isConnected } from '@/lib/ros-client/index.ts';
import type {
    NavigateToPoseFeedback,
    NavigateToPoseGoal,
    NavigateToPoseResult,
    PoseStamped,
} from '@/types/ros-messages.ts';

interface NavState {
    isExecuting: boolean;
    feedback: NavigateToPoseFeedback | null;
    result: NavigateToPoseResult | null;
    error: string | null;
    currentGoal: PoseStamped | null;
}

interface NavStore extends NavState {
    sendGoal: (pose: PoseStamped) => void;
    cancel: () => void;
    reset: () => void;
}

let action: ReturnType<
    typeof createAction<
        NavigateToPoseGoal,
        NavigateToPoseFeedback,
        NavigateToPoseResult
    >
> | null = null;
let currentGoalId: string | null = null;

function getAction() {
    if (!action) {
        action = createAction<
            NavigateToPoseGoal,
            NavigateToPoseFeedback,
            NavigateToPoseResult
        >('/navigate_to_pose', 'nav2_msgs/NavigateToPose');
    }
    return action;
}

export const useNavStore = create<NavStore>((set) => ({
    isExecuting: false,
    feedback: null,
    result: null,
    error: null,
    currentGoal: null,

    sendGoal: (pose: PoseStamped) => {
        if (!isConnected()) {
            set({ error: 'Not connected to rosbridge' });
            return;
        }

        if (currentGoalId) {
            getAction().cancelGoal(currentGoalId);
            currentGoalId = null;
        }

        set({
            isExecuting: true,
            feedback: null,
            result: null,
            error: null,
            currentGoal: pose,
        });

        const goalId = getAction().sendGoal(
            { pose },
            (result: NavigateToPoseResult) => {
                set({
                    isExecuting: false,
                    feedback: null,
                    result,
                    error: null,
                    currentGoal: null,
                });
                currentGoalId = null;
            },
            (feedback: NavigateToPoseFeedback) => {
                set({ feedback });
            },
            (error: string) => {
                set({
                    isExecuting: false,
                    error,
                    currentGoal: null,
                });
                currentGoalId = null;
            },
        );

        if (!goalId) {
            set({
                isExecuting: false,
                error: 'Failed to send navigation goal',
                currentGoal: null,
            });
            currentGoalId = null;
            return;
        }

        currentGoalId = goalId;
    },

    cancel: () => {
        if (currentGoalId) {
            getAction().cancelGoal(currentGoalId);
            currentGoalId = null;
            set({
                isExecuting: false,
                error: 'Cancelled',
                currentGoal: null,
            });
        }
    },

    reset: () => {
        if (currentGoalId) {
            getAction().cancelGoal(currentGoalId);
            currentGoalId = null;
        }
        set({
            isExecuting: false,
            feedback: null,
            result: null,
            error: null,
            currentGoal: null,
        });
    },
}));
