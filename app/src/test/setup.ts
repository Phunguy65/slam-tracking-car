import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('roslib', () => {
    function createRosMock() {
        return {
            on: vi.fn(),
            connect: vi.fn(),
            close: vi.fn(),
        };
    }

    function createTopicMock() {
        return {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            publish: vi.fn(),
        };
    }

    function createServiceMock() {
        return {
            callService: vi.fn(),
        };
    }

    function createActionMock() {
        return {
            sendGoal: vi.fn(),
            cancelGoal: vi.fn(),
            cancelAllGoals: vi.fn(),
        };
    }

    function createActionClientMock() {
        return {};
    }

    function createGoalMock() {
        return {
            send: vi.fn(),
            cancel: vi.fn(),
            on: vi.fn(),
        };
    }

    return {
        default: {
            Ros: vi.fn(createRosMock),
            Topic: vi.fn(createTopicMock),
            Service: vi.fn(createServiceMock),
            Action: vi.fn(createActionMock),
            ActionClient: vi.fn(createActionClientMock),
            Goal: vi.fn(createGoalMock),
        },
        Ros: vi.fn(createRosMock),
        Topic: vi.fn(createTopicMock),
        Service: vi.fn(createServiceMock),
        Action: vi.fn(createActionMock),
        ActionClient: vi.fn(createActionClientMock),
        Goal: vi.fn(createGoalMock),
    };
});

vi.mock('react-joystick-component', () => ({
    Joystick: vi.fn().mockImplementation(() => null),
}));
