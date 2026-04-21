import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('roslib', () => ({
    default: {
        Ros: vi.fn().mockImplementation(() => ({
            on: vi.fn(),
            connect: vi.fn(),
            close: vi.fn(),
        })),
        Topic: vi.fn().mockImplementation(() => ({
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            publish: vi.fn(),
        })),
        Service: vi.fn().mockImplementation(() => ({
            callService: vi.fn(),
        })),
        ActionClient: vi.fn().mockImplementation(() => ({})),
        Goal: vi.fn().mockImplementation(() => ({
            send: vi.fn(),
            cancel: vi.fn(),
            on: vi.fn(),
        })),
    },
    Ros: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn(),
        close: vi.fn(),
    })),
    Topic: vi.fn().mockImplementation(() => ({
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        publish: vi.fn(),
    })),
    Service: vi.fn().mockImplementation(() => ({
        callService: vi.fn(),
    })),
    ActionClient: vi.fn().mockImplementation(() => ({})),
    Goal: vi.fn().mockImplementation(() => ({
        send: vi.fn(),
        cancel: vi.fn(),
        on: vi.fn(),
    })),
}));

vi.mock('react-joystick-component', () => ({
    Joystick: vi.fn().mockImplementation(() => null),
}));
