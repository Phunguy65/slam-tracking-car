/**
 * Enrollment form component.
 *
 * Name input and submit button for enrolling a new person.
 */
'use client';

import { useCallback, useState } from 'react';
import { EnrollmentStatusType } from '@/types/enrollment.ts';

interface EnrollFormProps {
    status: number | null;
    enrollName: string;
    onNameChange: (name: string) => void;
    onSubmit: (name: string) => Promise<string | null>;
    isLoading: boolean;
    error: string | null;
}

export function EnrollForm({
    status,
    enrollName,
    onNameChange,
    onSubmit,
    isLoading,
    error,
}: EnrollFormProps) {
    const [localError, setLocalError] = useState<string | null>(null);

    const isReady = status === EnrollmentStatusType.READY;
    const canSubmit = isReady && enrollName.trim().length > 0 && !isLoading;

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setLocalError(null);

            if (!canSubmit) return;

            const trimmedName = enrollName.trim();
            if (!trimmedName) {
                setLocalError('Please enter a name');
                return;
            }

            const result = await onSubmit(trimmedName);
            if (!result) {
                // Error is set by parent via error prop
            }
        },
        [canSubmit, enrollName, onSubmit],
    );

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
                <label
                    htmlFor='enroll-name'
                    className='block text-sm font-medium text-gray-300 mb-1'
                >
                    Name
                </label>
                <input
                    id='enroll-name'
                    type='text'
                    value={enrollName}
                    onChange={(e) => {
                        onNameChange(e.target.value);
                        setLocalError(null);
                    }}
                    placeholder='Enter name for this person'
                    className='w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg
                               text-white placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                               disabled:opacity-50 disabled:cursor-not-allowed'
                    disabled={!isReady || isLoading}
                    autoComplete='off'
                />
            </div>

            {/* Error message */}
            {(error || localError) && (
                <p className='text-red-400 text-sm'>{error || localError}</p>
            )}

            {/* Help text */}
            {!isReady && (
                <p className='text-gray-400 text-sm'>
                    Position your face in the frame to enable enrollment.
                </p>
            )}

            <button
                type='submit'
                disabled={!canSubmit}
                className='w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500
                           disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
                           text-white font-semibold rounded-lg
                           transition-colors duration-200
                           flex items-center justify-center gap-2'
            >
                {isLoading ? (
                    <>
                        <svg
                            className='animate-spin h-5 w-5'
                            fill='none'
                            viewBox='0 0 24 24'
                            aria-hidden='true'
                            focusable='false'
                        >
                            <circle
                                className='opacity-25'
                                cx='12'
                                cy='12'
                                r='10'
                                stroke='currentColor'
                                strokeWidth='4'
                            />
                            <path
                                className='opacity-75'
                                fill='currentColor'
                                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                            />
                        </svg>
                        Adding...
                    </>
                ) : (
                    <>
                        <svg
                            className='w-5 h-5'
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
                                d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
                            />
                        </svg>
                        Add Person
                    </>
                )}
            </button>
        </form>
    );
}
