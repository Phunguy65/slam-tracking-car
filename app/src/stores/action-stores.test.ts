import { beforeEach, describe, expect, it, vi } from 'vitest';

async function prepareRoslib(actionMock: object, topicMock?: object) {
    const ROSLIB = await import('roslib');
    vi.mocked(ROSLIB.Action).mockClear();
    vi.mocked(ROSLIB.Action).mockImplementation(function () {
        Object.assign(this, actionMock);
    });
    vi.mocked(ROSLIB.ActionClient).mockClear();
    vi.mocked(ROSLIB.Goal).mockClear();
    vi.mocked(ROSLIB.Topic).mockClear();

    if (topicMock) {
        vi.mocked(ROSLIB.Topic).mockImplementation(function () {
            Object.assign(this, topicMock);
        });
    }

    const { useRosStore } = await import('@/stores/ros-store.ts');
    useRosStore.getState().setStatus('connected');

    return ROSLIB;
}

describe('ROS2 action stores', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('starts explore by publishing resume true', async () => {
        const actionMock = {
            sendGoal: vi.fn(),
            cancelGoal: vi.fn(),
            cancelAllGoals: vi.fn(),
        };
        const topicMock = {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            publish: vi.fn(),
        };
        const ROSLIB = await prepareRoslib(actionMock, topicMock);
        const { useExploreStore } = await import('@/stores/explore-store.ts');

        useExploreStore.getState().sendGoal();

        expect(ROSLIB.Topic).toHaveBeenCalledWith(
            expect.objectContaining({
                name: '/explore/resume',
                messageType: 'std_msgs/Bool',
            }),
        );
        expect(topicMock.publish).toHaveBeenCalledWith({ data: true });
        expect(ROSLIB.Action).not.toHaveBeenCalled();
        expect(ROSLIB.ActionClient).not.toHaveBeenCalled();
        expect(ROSLIB.Goal).not.toHaveBeenCalled();
        expect(actionMock.sendGoal).not.toHaveBeenCalled();
        expect(useExploreStore.getState().isExecuting).toBe(true);
    });

    it('stops explore by publishing resume false', async () => {
        const actionMock = {
            sendGoal: vi.fn(),
            cancelGoal: vi.fn(),
            cancelAllGoals: vi.fn(),
        };
        const topicMock = {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            publish: vi.fn(),
        };
        await prepareRoslib(actionMock, topicMock);
        const { useRosStore } = await import('@/stores/ros-store.ts');
        const { useExploreStore } = await import('@/stores/explore-store.ts');

        useExploreStore.getState().sendGoal();
        useRosStore.getState().setStatus('connected');
        useExploreStore.getState().cancel();

        expect(topicMock.publish).toHaveBeenNthCalledWith(1, { data: true });
        expect(topicMock.publish).toHaveBeenNthCalledWith(2, { data: false });
        expect(actionMock.cancelGoal).not.toHaveBeenCalled();
        expect(useExploreStore.getState()).toMatchObject({
            isExecuting: false,
            error: 'Cancelled',
        });
    });

    it('does not publish explore resume while disconnected', async () => {
        const actionMock = {
            sendGoal: vi.fn(),
            cancelGoal: vi.fn(),
            cancelAllGoals: vi.fn(),
        };
        const topicMock = {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            publish: vi.fn(),
        };
        await prepareRoslib(actionMock, topicMock);
        const { useRosStore } = await import('@/stores/ros-store.ts');
        const { useExploreStore } = await import('@/stores/explore-store.ts');
        useRosStore.getState().setStatus('disconnected');

        useExploreStore.getState().sendGoal();
        useExploreStore.getState().cancel();

        expect(topicMock.publish).not.toHaveBeenCalled();
        expect(useExploreStore.getState()).toMatchObject({
            isExecuting: false,
            error: 'Not connected to rosbridge',
        });
    });

    it('sends navigation pose goals through ROSLIB.Action', async () => {
        const actionMock = {
            sendGoal: vi.fn().mockReturnValue('nav-goal-1'),
            cancelGoal: vi.fn(),
            cancelAllGoals: vi.fn(),
        };
        const ROSLIB = await prepareRoslib(actionMock);
        const { useNavStore } = await import('@/stores/nav-store.ts');

        const pose = {
            header: { stamp: { sec: 0, nanosec: 0 }, frame_id: 'map' },
            pose: {
                position: { x: 1, y: 2, z: 0 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
        };

        useNavStore.getState().sendGoal(pose);

        expect(ROSLIB.Action).toHaveBeenCalledWith(
            expect.objectContaining({
                name: '/navigate_to_pose',
                actionType: 'nav2_msgs/NavigateToPose',
            }),
        );
        expect(actionMock.sendGoal).toHaveBeenCalledWith(
            { pose },
            expect.any(Function),
            expect.any(Function),
            expect.any(Function),
        );
        expect(ROSLIB.ActionClient).not.toHaveBeenCalled();
        expect(ROSLIB.Goal).not.toHaveBeenCalled();
    });
});
