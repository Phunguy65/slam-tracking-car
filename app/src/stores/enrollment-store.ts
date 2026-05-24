/**
 * Zustand store for enrollment state management.
 */
import { create } from 'zustand';
import type { EnrolledPerson, EnrollmentStatus } from '@/types/enrollment.ts';

interface EnrollmentState {
    /** Current enrollment status from ROS topic */
    status: EnrollmentStatus | null;
    /** List of enrolled persons */
    persons: EnrolledPerson[];
    /** Currently active tracking target ID */
    targetId: string | null;
    /** Name input for new enrollment */
    enrollName: string;
    /** Loading state for service calls */
    isLoading: boolean;
    /** Error message from last operation */
    error: string | null;

    /** Update status from ROS topic */
    setStatus: (status: EnrollmentStatus) => void;
    /** Set enrolled persons list */
    setPersons: (persons: EnrolledPerson[]) => void;
    /** Set active target ID */
    setTargetId: (id: string | null) => void;
    /** Set enrollment name input */
    setEnrollName: (name: string) => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
    /** Set error message */
    setError: (error: string | null) => void;
    /** Add a new person to the list (optimistic update) */
    addPerson: (person: EnrolledPerson) => void;
    /** Remove a person from the list (optimistic update) */
    removePerson: (personId: string) => void;
    /** Reset enrollment state for new enrollment */
    resetEnrollment: () => void;
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
    status: null,
    persons: [],
    targetId: null,
    enrollName: '',
    isLoading: false,
    error: null,

    setStatus: (status) => set({ status }),
    setPersons: (persons) => set({ persons }),
    setTargetId: (id) => set({ targetId: id }),
    setEnrollName: (name) => set({ enrollName: name }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    addPerson: (person) =>
        set((state) => ({
            persons: [person, ...state.persons],
        })),

    removePerson: (personId) =>
        set((state) => ({
            persons: state.persons.filter((p) => p.person_id !== personId),
            // Clear target if removed person was the target
            targetId: state.targetId === personId ? null : state.targetId,
        })),

    resetEnrollment: () =>
        set({
            enrollName: '',
            error: null,
        }),
}));
