/**
 * Hook for accessing ROS connection state.
 */
'use client';

import { useEffect } from 'react';
import { connect, disconnect, getRos } from '@/lib/ros-client/index.ts';
import { useRosStore } from '@/stores/ros-store.ts';

/**
 * Access ROS connection state and control functions.
 */
export function useRos() {
    const status = useRosStore((s) => s.status);
    const error = useRosStore((s) => s.error);
    const url = useRosStore((s) => s.url);
    const setUrl = useRosStore((s) => s.setUrl);

    // Initialize connection on mount
    useEffect(() => {
        // Only initialize on client side
        if (typeof window === 'undefined') return;

        getRos();

        return () => {
            // Don't disconnect on unmount — connection is global singleton
        };
    }, []);

    return {
        /** Current connection status */
        status,
        /** Whether currently connected */
        isConnected: status === 'connected',
        /** Error message if any */
        error,
        /** Current rosbridge URL */
        url,
        /** Update rosbridge URL and reconnect */
        setUrl: (newUrl: string) => {
            setUrl(newUrl);
            disconnect();
            connect(newUrl);
        },
        /** Manually trigger reconnection */
        reconnect: () => connect(url),
        /** Disconnect from rosbridge */
        disconnect,
    };
}
