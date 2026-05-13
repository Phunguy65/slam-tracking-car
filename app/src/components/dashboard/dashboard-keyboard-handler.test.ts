/**
 * Tests for dashboard keyboard handler behavior.
 */
import { describe, expect, it } from 'vitest';

describe('Dashboard Keyboard Handler', () => {
    const EDITABLE_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT'];
    const ARROW_CONSUMING_ROLES = ['slider', 'spinbutton', 'listbox', 'menu'];

    function isEditableTarget(target: EventTarget | null): boolean {
        if (!target || !(target instanceof Element)) return false;
        const tagName = target.tagName;
        if (EDITABLE_ELEMENTS.includes(tagName)) return true;
        const role = target.getAttribute('role');
        if (role && ARROW_CONSUMING_ROLES.includes(role)) return true;
        if (target.getAttribute('contenteditable') === 'true') return true;
        return false;
    }

    describe('isEditableTarget', () => {
        it('should return true for INPUT elements', () => {
            const input = document.createElement('input');
            expect(isEditableTarget(input)).toBe(true);
        });

        it('should return true for TEXTAREA elements', () => {
            const textarea = document.createElement('textarea');
            expect(isEditableTarget(textarea)).toBe(true);
        });

        it('should return true for SELECT elements', () => {
            const select = document.createElement('select');
            expect(isEditableTarget(select)).toBe(true);
        });

        it('should return true for contenteditable elements', () => {
            const div = document.createElement('div');
            div.setAttribute('contenteditable', 'true');
            expect(isEditableTarget(div)).toBe(true);
        });

        it('should return true for slider role elements', () => {
            const div = document.createElement('div');
            div.setAttribute('role', 'slider');
            expect(isEditableTarget(div)).toBe(true);
        });

        it('should return false for regular buttons', () => {
            const button = document.createElement('button');
            expect(isEditableTarget(button)).toBe(false);
        });

        it('should return false for div elements', () => {
            const div = document.createElement('div');
            expect(isEditableTarget(div)).toBe(false);
        });

        it('should return false for null target', () => {
            expect(isEditableTarget(null)).toBe(false);
        });
    });

    describe('joystick control gating', () => {
        type TestState = {
            primaryMode: 'slam';
            slamSubmode: 'mapping' | 'navigation';
            autoExplore: boolean;
            isConnected: boolean;
        };

        function canUseJoystick(state: TestState): boolean {
            if (!state.isConnected) return false;

            if (state.primaryMode === 'slam') {
                if (state.slamSubmode === 'navigation') return false;
                if (state.autoExplore) return false;
                return true;
            }

            return false;
        }

        it('should allow joystick in SLAM mapping without auto explore', () => {
            const state: TestState = {
                primaryMode: 'slam',
                slamSubmode: 'mapping',
                autoExplore: false,
                isConnected: true,
            };
            expect(canUseJoystick(state)).toBe(true);
        });

        it('should disable joystick in SLAM mapping with auto explore', () => {
            const state: TestState = {
                primaryMode: 'slam',
                slamSubmode: 'mapping',
                autoExplore: true,
                isConnected: true,
            };
            expect(canUseJoystick(state)).toBe(false);
        });

        it('should disable joystick in SLAM navigation', () => {
            const state: TestState = {
                primaryMode: 'slam',
                slamSubmode: 'navigation',
                autoExplore: false,
                isConnected: true,
            };
            expect(canUseJoystick(state)).toBe(false);
        });

        it('should disable joystick when disconnected', () => {
            const state: TestState = {
                primaryMode: 'slam',
                slamSubmode: 'mapping',
                autoExplore: false,
                isConnected: false,
            };
            expect(canUseJoystick(state)).toBe(false);
        });
    });
});
