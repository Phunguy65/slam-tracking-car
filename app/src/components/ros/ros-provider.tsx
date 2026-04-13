/**
 * ROS Provider component.
 *
 * Initializes the ROS connection and provides context to children.
 */
'use client';

import { type ReactNode, useEffect } from 'react';
import { connect } from '@/lib/ros-client/index.ts';
import { useRosStore } from '@/stores/ros-store.ts';

interface RosProviderProps {
    children: ReactNode;
}

export function RosProvider({ children }: RosProviderProps) {
    const url = useRosStore((s) => s.url);

    useEffect(() => {
        // Auto-connect to rosbridge on mount
        connect(url);
    }, [url]);

    return <>{children}</>;
}
