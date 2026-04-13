/**
 * Navigation store for shared action state.
 *
 * Provides singleton state for NavigateToPose action so that
 * GoalSetter and NavigationStatus share the same state.
 */

import { create } from 'zustand';
import {
    createActionClient,
    createGoal,
    isConnected,
} from '@/lib/ros-client/index.ts';
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

let actionClient: ReturnType<
    typeof createActionClient<
        NavigateToPoseGoal,
        NavigateToPoseFeedback,
        NavigateToPoseResult
    >
> | null = null;
let currentGoalHandle: ReturnType<
    typeof createGoal<
        NavigateToPoseGoal,
        NavigateToPoseFeedback,
        NavigateToPoseResult
    >
> | null = null;

function getActionClient() {
    if (!actionClient) {
        actionClient = createActionClient<
            NavigateToPoseGoal,
            NavigateToPoseFeedback,
            NavigateToPoseResult
        >('/navigate_to_pose', 'nav2_msgs/NavigateToPose');
    }
    return actionClient;
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

        // Cancel any existing goal
        if (currentGoalHandle) {
            currentGoalHandle.cancel();
        }

        set({
            isExecuting: true,
            feedback: null,
            result: null,
            error: null,
            currentGoal: pose,
        });

        const client = getActionClient();
        const goal = createGoal<
            NavigateToPoseGoal,
            NavigateToPoseFeedback,
            NavigateToPoseResult
        >(client, { pose });

        currentGoalHandle = goal;

        goal.on('feedback', (feedback: NavigateToPoseFeedback) => {
            set({ feedback });
        });

        goal.on('result', (result: NavigateToPoseResult) => {
            set({
                isExecuting: false,
                feedback: null,
                result,
                currentGoal: null,
            });
            currentGoalHandle = null;
        });

        goal.on('timeout', () => {
            set({
                isExecuting: false,
                error: 'Action timed out',
                currentGoal: null,
            });
            currentGoalHandle = null;
        });

        goal.send();
    },

    cancel: () => {
        if (currentGoalHandle) {
            currentGoalHandle.cancel();
            currentGoalHandle = null;
            set({
                isExecuting: false,
                error: 'Cancelled',
                currentGoal: null,
            });
        }
    },

    reset: () => {
        if (currentGoalHandle) {
            currentGoalHandle.cancel();
            currentGoalHandle = null;
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
