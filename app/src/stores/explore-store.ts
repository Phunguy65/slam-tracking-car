/**
 * Explore store for m-explore /explore/explore action.
 *
 * Provides singleton state for the explore action so that ExploreToggle
 * and ModeController share the same goal handle. Reuses the roslib action
 * pattern from nav-store.
 */

import { create } from 'zustand';
import {
    createActionClient,
    createGoal,
    isConnected,
} from '@/lib/ros-client/index.ts';
import type {
    ExploreFeedback,
    ExploreGoal,
    ExploreResult,
} from '@/types/ros-messages.ts';

interface ExploreState {
    isExecuting: boolean;
    feedback: ExploreFeedback | null;
    result: ExploreResult | null;
    error: string | null;
}

interface ExploreStore extends ExploreState {
    sendGoal: () => void;
    cancel: () => void;
    reset: () => void;
}

let actionClient: ReturnType<
    typeof createActionClient<ExploreGoal, ExploreFeedback, ExploreResult>
> | null = null;
let currentGoalHandle: ReturnType<
    typeof createGoal<ExploreGoal, ExploreFeedback, ExploreResult>
> | null = null;

function getActionClient() {
    if (!actionClient) {
        actionClient = createActionClient<
            ExploreGoal,
            ExploreFeedback,
            ExploreResult
        >('/explore/explore', 'explore_lite_msgs/Explore');
    }
    return actionClient;
}

export const useExploreStore = create<ExploreStore>((set) => ({
    isExecuting: false,
    feedback: null,
    result: null,
    error: null,

    sendGoal: () => {
        if (!isConnected()) {
            set({ error: 'Not connected to rosbridge' });
            return;
        }

        if (currentGoalHandle) {
            currentGoalHandle.cancel();
        }

        set({
            isExecuting: true,
            feedback: null,
            result: null,
            error: null,
        });

        const client = getActionClient();
        const goal = createGoal<ExploreGoal, ExploreFeedback, ExploreResult>(
            client,
            {} as ExploreGoal,
        );

        currentGoalHandle = goal;

        goal.on('feedback', (feedback: ExploreFeedback) => {
            set({ feedback });
        });

        goal.on('result', (result: ExploreResult) => {
            set({
                isExecuting: false,
                feedback: null,
                result,
            });
            currentGoalHandle = null;
        });

        goal.on('timeout', () => {
            set({
                isExecuting: false,
                error: 'Explore action timed out',
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
        });
    },
}));
