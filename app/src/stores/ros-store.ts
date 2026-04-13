import { create } from 'zustand';

export type ConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error';

interface RosState {
    /** Current WebSocket connection status */
    status: ConnectionStatus;
    /** Error message if connection failed */
    error: string | null;
    /** rosbridge WebSocket URL */
    url: string;
    /** Set connection status */
    setStatus: (status: ConnectionStatus) => void;
    /** Set error message */
    setError: (error: string | null) => void;
    /** Update URL (triggers reconnection in ros-client) */
    setUrl: (url: string) => void;
}

export const useRosStore = create<RosState>((set) => ({
    status: 'disconnected',
    error: null,
    url:
        typeof window !== 'undefined'
            ? `ws://${window.location.hostname}:9090`
            : 'ws://localhost:9090',
    setStatus: (status) =>
        set({ status, error: status === 'connected' ? null : undefined }),
    setError: (error) => set({ error, status: 'error' }),
    setUrl: (url) => set({ url }),
}));
