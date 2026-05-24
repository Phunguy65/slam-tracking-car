/**
 * Person list component.
 *
 * Displays all enrolled persons with actions to set target or remove.
 */
'use client';

import type { EnrolledPerson } from '@/types/enrollment.ts';
import { PersonCard } from './person-card.tsx';

interface PersonListProps {
    persons: EnrolledPerson[];
    targetId: string | null;
    onSetTarget: (personId: string | null) => Promise<boolean>;
    onRemove: (personId: string) => Promise<boolean>;
}

export function PersonList({
    persons,
    targetId,
    onSetTarget,
    onRemove,
}: PersonListProps) {
    if (persons.length === 0) {
        return (
            <div className='text-center py-8'>
                <svg
                    className='w-16 h-16 mx-auto text-gray-600 mb-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    aria-hidden='true'
                    focusable='false'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                    />
                </svg>
                <h3 className='text-gray-400 font-medium mb-1'>
                    No enrolled persons
                </h3>
                <p className='text-gray-500 text-sm'>
                    Use the camera above to enroll someone.
                </p>
            </div>
        );
    }

    return (
        <div className='space-y-3'>
            {/* Clear target button if target is set */}
            {targetId && (
                <button
                    type='button'
                    onClick={() => onSetTarget(null)}
                    className='w-full px-4 py-2 text-sm bg-gray-700/50 hover:bg-gray-700
                               text-gray-300 rounded-lg transition-colors
                               flex items-center justify-center gap-2'
                >
                    <svg
                        className='w-4 h-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        aria-hidden='true'
                        focusable='false'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M6 18L18 6M6 6l12 12'
                        />
                    </svg>
                    Clear target (follow any person)
                </button>
            )}

            {/* Person cards */}
            {persons.map((person) => (
                <PersonCard
                    key={person.person_id}
                    person={person}
                    isTarget={person.person_id === targetId}
                    onSetTarget={() => onSetTarget(person.person_id)}
                    onRemove={() => onRemove(person.person_id)}
                />
            ))}
        </div>
    );
}
