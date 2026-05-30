/**
 * Hook for enrollment service calls and state management.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useService } from '@/hooks/use-service.ts';
import { useTopic } from '@/hooks/use-topic.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';
import { useEnrollmentStore } from '@/stores/enrollment-store.ts';
import type {
    AddPersonRequest,
    AddPersonResponse,
    EnrollmentStatus,
    GetTrackingTargetRequest,
    GetTrackingTargetResponse,
    ListPersonsRequest,
    ListPersonsResponse,
    RemovePersonRequest,
    RemovePersonResponse,
    SetTrackingTargetRequest,
    SetTrackingTargetResponse,
} from '@/types/enrollment.ts';

/**
 * Hook for enrollment functionality.
 *
 * Subscribes to enrollment status topic and provides service call methods.
 */
export function useEnrollment() {
    const persons = useEnrollmentStore((s) => s.persons);
    const targetId = useEnrollmentStore((s) => s.targetId);
    const enrollName = useEnrollmentStore((s) => s.enrollName);
    const isLoading = useEnrollmentStore((s) => s.isLoading);
    const error = useEnrollmentStore((s) => s.error);
    const status = useEnrollmentStore((s) => s.status);
    const setPersons = useEnrollmentStore((s) => s.setPersons);
    const setTargetId = useEnrollmentStore((s) => s.setTargetId);
    const setLoading = useEnrollmentStore((s) => s.setLoading);
    const setError = useEnrollmentStore((s) => s.setError);
    const addPersonToStore = useEnrollmentStore((s) => s.addPerson);
    const removePersonFromStore = useEnrollmentStore((s) => s.removePerson);
    const resetEnrollment = useEnrollmentStore((s) => s.resetEnrollment);
    const setEnrollName = useEnrollmentStore((s) => s.setEnrollName);
    const setStatus = useEnrollmentStore((s) => s.setStatus);
    const setDashboardTargetPerson = useDashboardStore(
        (s) => s.setTargetPerson,
    );

    const hasFetched = useRef(false);

    // Services
    const addPersonService = useService<AddPersonRequest, AddPersonResponse>(
        '/enrollment/add_person',
        'slam_car_interfaces/srv/AddPerson',
    );

    const removePersonService = useService<
        RemovePersonRequest,
        RemovePersonResponse
    >('/enrollment/remove_person', 'slam_car_interfaces/srv/RemovePerson');

    const listPersonsService = useService<
        ListPersonsRequest,
        ListPersonsResponse
    >('/enrollment/list_persons', 'slam_car_interfaces/srv/ListPersons');

    const setTargetService = useService<
        SetTrackingTargetRequest,
        SetTrackingTargetResponse
    >('/enrollment/set_target', 'slam_car_interfaces/srv/SetTrackingTarget');

    const getTargetService = useService<
        GetTrackingTargetRequest,
        GetTrackingTargetResponse
    >('/enrollment/get_target', 'slam_car_interfaces/srv/GetTrackingTarget');

    // Refresh persons list from service
    const refreshPersons = useCallback(async () => {
        try {
            setLoading(true);
            const response = await listPersonsService.call({});
            setPersons(response.persons || []);
        } catch (error) {
            console.error('[useEnrollment] Failed to list persons:', error);
        } finally {
            setLoading(false);
        }
    }, [listPersonsService, setLoading, setPersons]);

    // Refresh current target from service
    const refreshTarget = useCallback(async () => {
        try {
            const response = await getTargetService.call({});
            const targetIdValue = response.person_id || null;
            setTargetId(targetIdValue);
            setDashboardTargetPerson(targetIdValue);
        } catch (error) {
            console.error('[useEnrollment] Failed to get target:', error);
        }
    }, [getTargetService, setTargetId, setDashboardTargetPerson]);

    // Subscribe to enrollment status
    useTopic<EnrollmentStatus>(
        '/enrollment/status',
        'slam_car_interfaces/msg/EnrollmentStatus',
        setStatus,
        { throttleRate: 100 },
    );

    // Load initial persons and target on mount
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        refreshPersons();
        refreshTarget();
    }, [refreshPersons, refreshTarget]);

    // Add a new person
    const addPerson = useCallback(
        async (name: string) => {
            setError(null);
            setLoading(true);

            try {
                const response = await addPersonService.call({ name });

                if (response.success) {
                    addPersonToStore({
                        person_id: response.person_id,
                        name,
                        thumbnail_base64: '',
                        created_at: new Date().toISOString(),
                    });
                    resetEnrollment();
                    await refreshPersons();
                    return response.person_id;
                } else {
                    setError(response.error_message);
                    return null;
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : 'Failed to add person';
                setError(msg);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [
            addPersonService,
            setError,
            setLoading,
            addPersonToStore,
            resetEnrollment,
            refreshPersons,
        ],
    );

    // Remove a person
    const removePerson = useCallback(
        async (personId: string) => {
            setError(null);
            setLoading(true);

            try {
                const response = await removePersonService.call({
                    person_id: personId,
                });

                if (response.success) {
                    removePersonFromStore(personId);
                    return true;
                } else {
                    setError(response.error_message);
                    return false;
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : 'Failed to remove person';
                setError(msg);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [removePersonService, setError, setLoading, removePersonFromStore],
    );

    // Set tracking target
    const setTarget = useCallback(
        async (personId: string | null) => {
            setError(null);

            try {
                const response = await setTargetService.call({
                    person_id: personId || '',
                });

                if (response.success) {
                    setTargetId(personId || null);
                    setDashboardTargetPerson(personId || null);
                    return true;
                } else {
                    setError(response.error_message);
                    return false;
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : 'Failed to set target';
                setError(msg);
                return false;
            }
        },
        [setTargetService, setError, setTargetId, setDashboardTargetPerson],
    );

    return {
        // State
        status,
        persons,
        targetId,
        enrollName,
        isLoading,
        error,

        // State setters
        setEnrollName,

        // Actions
        addPerson,
        removePerson,
        setTarget,
        refreshPersons,
        refreshTarget,
    };
}
