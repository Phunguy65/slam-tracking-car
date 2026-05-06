import { create } from 'zustand';
import { isConnected, publish } from '@/lib/ros-client/index.ts';

interface ExploreState {
    isExecuting: boolean;
    feedback: null;
    result: null;
    error: string | null;
}

interface ExploreStore extends ExploreState {
    sendGoal: () => void;
    cancel: () => void;
    reset: () => void;
}

function publishResume(data: boolean) {
    publish('/explore/resume', 'std_msgs/Bool', { data });
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

        publishResume(true);
        set({
            isExecuting: true,
            feedback: null,
            result: null,
            error: null,
        });
    },

    cancel: () => {
        if (!isConnected()) {
            set({ error: 'Not connected to rosbridge' });
            return;
        }

        publishResume(false);
        set({
            isExecuting: false,
            error: 'Cancelled',
        });
    },

    reset: () => {
        set({
            isExecuting: false,
            feedback: null,
            result: null,
            error: null,
        });
    },
}));
