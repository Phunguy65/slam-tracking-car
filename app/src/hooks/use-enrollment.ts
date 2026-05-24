/**
 * Hook for enrollment service calls and state management.
 */
'use client';

import { useCallback, useEffect } from 'react';
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
    const store = useEnrollmentStore();
    const setDashboardTargetPerson = useDashboardStore(
        (s) => s.setTargetPerson,
    );

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
            store.setLoading(true);
            const response = await listPersonsService.call({});
            store.setPersons(response.persons || []);
        } catch (error) {
            console.error('[useEnrollment] Failed to list persons:', error);
        } finally {
            store.setLoading(false);
        }
    }, [listPersonsService, store]);

    // Refresh current target from service
    const refreshTarget = useCallback(async () => {
        try {
            const response = await getTargetService.call({});
            const targetId = response.person_id || null;
            store.setTargetId(targetId);
            setDashboardTargetPerson(targetId);
        } catch (error) {
            console.error('[useEnrollment] Failed to get target:', error);
        }
    }, [getTargetService, store, setDashboardTargetPerson]);

    // Subscribe to enrollment status
    useTopic<EnrollmentStatus>(
        '/enrollment/status',
        'slam_car_interfaces/msg/EnrollmentStatus',
        store.setStatus,
        { throttleRate: 100 },
    );

    // Load initial persons and target on mount
    useEffect(() => {
        refreshPersons();
        refreshTarget();
    }, [refreshPersons, refreshTarget]);

    // Add a new person
    const addPerson = useCallback(
        async (name: string) => {
            store.setError(null);
            store.setLoading(true);

            try {
                const response = await addPersonService.call({ name });

                if (response.success) {
                    // Optimistically add to list (will be refreshed anyway)
                    store.addPerson({
                        person_id: response.person_id,
                        name,
                        thumbnail_base64: '', // Will be updated on refresh
                        created_at: new Date().toISOString(),
                    });
                    store.resetEnrollment();
                    // Refresh to get proper thumbnail
                    await refreshPersons();
                    return response.person_id;
                } else {
                    store.setError(response.error_message);
                    return null;
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : 'Failed to add person';
                store.setError(msg);
                return null;
            } finally {
                store.setLoading(false);
            }
        },
        [addPersonService, store, refreshPersons],
    );

    // Remove a person
    const removePerson = useCallback(
        async (personId: string) => {
            store.setError(null);
            store.setLoading(true);

            try {
                const response = await removePersonService.call({
                    person_id: personId,
                });

                if (response.success) {
                    store.removePerson(personId);
                    return true;
                } else {
                    store.setError(response.error_message);
                    return false;
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : 'Failed to remove person';
                store.setError(msg);
                return false;
            } finally {
                store.setLoading(false);
            }
        },
        [removePersonService, store],
    );

    // Set tracking target
    const setTarget = useCallback(
        async (personId: string | null) => {
            store.setError(null);

            try {
                const response = await setTargetService.call({
                    person_id: personId || '',
                });

                if (response.success) {
                    store.setTargetId(personId || null);
                    setDashboardTargetPerson(personId || null);
                    return true;
                } else {
                    store.setError(response.error_message);
                    return false;
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : 'Failed to set target';
                store.setError(msg);
                return false;
            }
        },
        [setTargetService, store, setDashboardTargetPerson],
    );

    return {
        // State
        status: store.status,
        persons: store.persons,
        targetId: store.targetId,
        enrollName: store.enrollName,
        isLoading: store.isLoading,
        error: store.error,

        // State setters
        setEnrollName: store.setEnrollName,

        // Actions
        addPerson,
        removePerson,
        setTarget,
        refreshPersons,
        refreshTarget,
    };
}
