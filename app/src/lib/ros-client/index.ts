/**
 * ROS client wrapper with auto-reconnection.
 *
 * Singleton that manages the rosbridge WebSocket connection.
 * Uses roslibjs under the hood.
 */

export type { RosAction } from './real-client.ts';
export {
    connect,
    createAction,
    createService,
    createTopic,
    disconnect,
    getRos,
    isConnected,
    publish,
    reconnect,
} from './real-client.ts';
