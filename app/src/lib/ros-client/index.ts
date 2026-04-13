/**
 * ROS client wrapper with auto-reconnection.
 *
 * Singleton that manages the rosbridge WebSocket connection.
 * Uses roslibjs under the hood.
 */
export {
    connect,
    createActionClient,
    createGoal,
    createService,
    createTopic,
    disconnect,
    getRos,
    isConnected,
    publish,
} from './real-client.ts';
