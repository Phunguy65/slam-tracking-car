/**
 * Hook for ROS action clients.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import {
    createActionClient,
    createGoal,
    isConnected,
} from '@/lib/ros-client/index.ts';

interface ActionState<TFeedback, TResult> {
    /** Whether an action is currently executing */
    isExecuting: boolean;
    /** Latest feedback from the action */
    feedback: TFeedback | null;
    /** Result from the last completed action */
    result: TResult | null;
    /** Error from the last failed action */
    error: string | null;
}

interface UseActionResult<TGoal, TFeedback, TResult>
    extends ActionState<TFeedback, TResult> {
    /** Send a goal to the action server */
    sendGoal: (goal: TGoal) => void;
    /** Cancel the current goal */
    cancel: () => void;
}

/**
 * Create an action client hook.
 *
 * @param serverName - Name of the action server (e.g., '/navigate_to_pose')
 * @param actionType - ROS action type (e.g., 'nav2_msgs/NavigateToPose')
 */
export function useAction<TGoal, TFeedback, TResult>(
    serverName: string,
    actionType: string,
): UseActionResult<TGoal, TFeedback, TResult> {
    const [state, setState] = useState<ActionState<TFeedback, TResult>>({
        isExecuting: false,
        feedback: null,
        result: null,
        error: null,
    });

    const clientRef = useRef<ReturnType<
        typeof createActionClient<TGoal, TFeedback, TResult>
    > | null>(null);
    const goalRef = useRef<ReturnType<
        typeof createGoal<TGoal, TFeedback, TResult>
    > | null>(null);

    const getClient = useCallback(() => {
        if (!clientRef.current) {
            clientRef.current = createActionClient<TGoal, TFeedback, TResult>(
                serverName,
                actionType,
            );
        }
        return clientRef.current;
    }, [serverName, actionType]);

    const sendGoal = useCallback(
        (goalMessage: TGoal) => {
            if (!isConnected()) {
                setState((s) => ({
                    ...s,
                    error: 'Not connected to rosbridge',
                }));
                return;
            }

            const client = getClient();

            // Cancel any existing goal
            if (goalRef.current) {
                goalRef.current.cancel();
            }

            setState({
                isExecuting: true,
                feedback: null,
                result: null,
                error: null,
            });

            const goal = createGoal<TGoal, TFeedback, TResult>(
                client,
                goalMessage,
            );

            goalRef.current = goal;

            goal.on('feedback', (feedback: TFeedback) => {
                setState((s) => ({ ...s, feedback }));
            });

            goal.on('result', (result: TResult) => {
                setState({
                    isExecuting: false,
                    feedback: null,
                    result,
                    error: null,
                });
                goalRef.current = null;
            });

            goal.on('timeout', () => {
                setState((s) => ({
                    ...s,
                    isExecuting: false,
                    error: 'Action timed out',
                }));
                goalRef.current = null;
            });

            goal.send();
        },
        [getClient],
    );

    const cancel = useCallback(() => {
        if (goalRef.current) {
            goalRef.current.cancel();
            goalRef.current = null;
            setState((s) => ({
                ...s,
                isExecuting: false,
                error: 'Cancelled',
            }));
        }
    }, []);

    return {
        ...state,
        sendGoal,
        cancel,
    };
}
