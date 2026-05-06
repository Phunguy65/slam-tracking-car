/**
 * ROS client wrapper with auto-reconnection.
 *
 * Singleton that manages the rosbridge WebSocket connection.
 * Uses roslibjs under the hood.
 */
import * as ROSLIB from 'roslib';
import { useRosStore } from '@/stores/ros-store.ts';

let rosInstance: ROSLIB.Ros | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_INTERVAL = 2000;

/**
 * Get or create the ROS connection instance.
 * Automatically connects to the URL from the store.
 */
export function getRos(): ROSLIB.Ros {
    if (rosInstance) return rosInstance;

    const { url, setStatus, setError } = useRosStore.getState();

    rosInstance = new ROSLIB.Ros({});

    rosInstance.on('connection', () => {
        console.log('[ros-client] Connected to rosbridge');
        setStatus('connected');
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    });

    rosInstance.on('error', (error: unknown) => {
        console.error('[ros-client] Connection error:', error);
        const msg = error instanceof Error ? error.message : 'Connection error';
        setError(msg);
    });

    rosInstance.on('close', () => {
        console.log('[ros-client] Connection closed');
        setStatus('disconnected');
        scheduleReconnect();
    });

    // Initial connection
    connect(url);

    return rosInstance;
}

/**
 * Connect to rosbridge at the given URL.
 */
export function connect(url: string): void {
    if (!rosInstance) {
        getRos();
        return;
    }

    const { setStatus } = useRosStore.getState();
    setStatus('connecting');

    try {
        rosInstance.connect(url);
    } catch (err) {
        console.error('[ros-client] Failed to connect:', err);
        scheduleReconnect();
    }
}

/**
 * Disconnect from rosbridge.
 */
export function disconnect(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (rosInstance) {
        rosInstance.close();
        rosInstance = null;
    }

    useRosStore.getState().setStatus('disconnected');
}

/**
 * Force an immediate reconnection attempt.
 */
export function reconnect(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    const { url } = useRosStore.getState();

    if (rosInstance) {
        rosInstance.close();
    }

    connect(url);
}

/**
 * Schedule a reconnection attempt.
 */
function scheduleReconnect(): void {
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        const { url, status } = useRosStore.getState();

        if (status !== 'connected') {
            console.log('[ros-client] Attempting reconnection...');
            connect(url);
        }
    }, RECONNECT_INTERVAL);
}

/**
 * Create a topic subscriber.
 */
export function createTopic<T>(
    name: string,
    messageType: string,
    options?: {
        throttleRate?: number;
        latch?: boolean;
        queueSize?: number;
    },
): ROSLIB.Topic<T> {
    const ros = getRos();
    return new ROSLIB.Topic({
        ros,
        name,
        messageType,
        throttle_rate: options?.throttleRate,
        latch: options?.latch,
        queue_size: options?.queueSize ?? 1,
    });
}

/**
 * Create a service client.
 */
export function createService<TReq, TRes>(
    name: string,
    serviceType: string,
): ROSLIB.Service<TReq, TRes> {
    const ros = getRos();
    return new ROSLIB.Service({
        ros,
        name,
        serviceType,
    });
}

export interface RosAction<TGoal, TFeedback, TResult> {
    sendGoal: (
        goal: TGoal,
        resultCallback: (result: TResult) => void,
        feedbackCallback?: (feedback: TFeedback) => void,
        failedCallback?: (error: string) => void,
    ) => string | undefined;
    cancelGoal: (id: string) => void;
    cancelAllGoals: () => void;
}

type RosActionConstructor = new <TGoal, TFeedback, TResult>(options: {
    ros: ROSLIB.Ros;
    name: string;
    actionType: string;
}) => RosAction<TGoal, TFeedback, TResult>;

function getRosActionConstructor(): RosActionConstructor {
    return (ROSLIB as unknown as { Action: RosActionConstructor }).Action;
}

/**
 * Create a ROS 2 action client.
 */
export function createAction<TGoal, TFeedback, TResult>(
    name: string,
    actionType: string,
): RosAction<TGoal, TFeedback, TResult> {
    const ros = getRos();
    const Action = getRosActionConstructor();
    return new Action<TGoal, TFeedback, TResult>({
        ros,
        name,
        actionType,
    });
}

/**
 * Publish a single message to a topic.
 */
export function publish<T>(
    topicName: string,
    messageType: string,
    message: T,
): void {
    const topic = createTopic<T>(topicName, messageType);
    topic.publish(message);
}

/**
 * Check if currently connected.
 */
export function isConnected(): boolean {
    return useRosStore.getState().status === 'connected';
}
