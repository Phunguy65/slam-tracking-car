/**
 * Hook for subscribing to ROS topics.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import type * as ROSLIB from 'roslib';
import { createTopic, isConnected } from '@/lib/ros-client/index.ts';
import { useRosStore } from '@/stores/ros-store.ts';

interface UseTopicOptions {
    /** Throttle rate in ms (default: 0 = no throttle) */
    throttleRate?: number;
    /** Whether to receive latched messages */
    latch?: boolean;
    /** Queue size for messages (default: 1) */
    queueSize?: number;
    /** Only subscribe when this is true */
    enabled?: boolean;
}

/**
 * Subscribe to a ROS topic.
 *
 * @param topicName - Name of the topic (e.g., '/camera/image_raw/compressed')
 * @param messageType - ROS message type (e.g., 'sensor_msgs/CompressedImage')
 * @param callback - Function called when a message is received
 * @param options - Subscription options
 */
export function useTopic<T>(
    topicName: string,
    messageType: string,
    callback: (message: T) => void,
    options: UseTopicOptions = {},
): void {
    const { throttleRate, latch, queueSize, enabled = true } = options;
    const topicRef = useRef<ROSLIB.Topic<T> | null>(null);
    const callbackRef = useRef(callback);
    const status = useRosStore((s) => s.status);

    // Keep callback ref up to date
    callbackRef.current = callback;

    // Stable handler that uses ref
    const handleMessage = useCallback((message: T) => {
        callbackRef.current(message);
    }, []);

    useEffect(() => {
        if (!enabled || status !== 'connected') {
            // Unsubscribe if disabled or disconnected
            if (topicRef.current) {
                topicRef.current.unsubscribe();
                topicRef.current = null;
            }
            return;
        }

        // Create and subscribe to topic
        const topic = createTopic<T>(topicName, messageType, {
            throttleRate,
            latch,
            queueSize,
        });
        topicRef.current = topic;
        topic.subscribe(handleMessage);

        return () => {
            topic.unsubscribe();
            topicRef.current = null;
        };
    }, [
        topicName,
        messageType,
        throttleRate,
        latch,
        queueSize,
        enabled,
        status,
        handleMessage,
    ]);
}

/**
 * Publish to a ROS topic.
 *
 * Returns a publish function that can be called with messages.
 */
export function usePublisher<T extends ROSLIB.Message>(
    topicName: string,
    messageType: string,
): (message: T) => void {
    const topicRef = useRef<ROSLIB.Topic<T> | null>(null);
    const status = useRosStore((s) => s.status);

    useEffect(() => {
        if (status !== 'connected') {
            // Clean up existing topic if disconnected
            if (topicRef.current) {
                topicRef.current.unadvertise();
                topicRef.current = null;
            }
            return;
        }

        topicRef.current = createTopic<T>(topicName, messageType);

        return () => {
            // Clean up on unmount - unadvertise to prevent rosbridge leak
            if (topicRef.current) {
                topicRef.current.unadvertise();
                topicRef.current = null;
            }
        };
    }, [topicName, messageType, status]);

    return useCallback((message: T) => {
        if (topicRef.current && isConnected()) {
            topicRef.current.publish(message);
        }
    }, []);
}
