/**
 * Hook for ROS action clients.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { createAction, isConnected } from '@/lib/ros-client/index.ts';

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

    const actionRef = useRef<ReturnType<
        typeof createAction<TGoal, TFeedback, TResult>
    > | null>(null);
    const goalIdRef = useRef<string | null>(null);

    const getAction = useCallback(() => {
        if (!actionRef.current) {
            actionRef.current = createAction<TGoal, TFeedback, TResult>(
                serverName,
                actionType,
            );
        }
        return actionRef.current;
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

            const action = getAction();

            if (goalIdRef.current) {
                action.cancelGoal(goalIdRef.current);
                goalIdRef.current = null;
            }

            setState({
                isExecuting: true,
                feedback: null,
                result: null,
                error: null,
            });

            const goalId = action.sendGoal(
                goalMessage,
                (result: TResult) => {
                    setState({
                        isExecuting: false,
                        feedback: null,
                        result,
                        error: null,
                    });
                    goalIdRef.current = null;
                },
                (feedback: TFeedback) => {
                    setState((s) => ({ ...s, feedback }));
                },
                (error: string) => {
                    setState((s) => ({
                        ...s,
                        isExecuting: false,
                        error,
                    }));
                    goalIdRef.current = null;
                },
            );

            if (!goalId) {
                setState((s) => ({
                    ...s,
                    isExecuting: false,
                    error: 'Failed to send action goal',
                }));
                goalIdRef.current = null;
                return;
            }

            goalIdRef.current = goalId;
        },
        [getAction],
    );

    const cancel = useCallback(() => {
        if (goalIdRef.current) {
            getAction().cancelGoal(goalIdRef.current);
            goalIdRef.current = null;
            setState((s) => ({
                ...s,
                isExecuting: false,
                error: 'Cancelled',
            }));
        }
    }, [getAction]);

    return {
        ...state,
        sendGoal,
        cancel,
    };
}
