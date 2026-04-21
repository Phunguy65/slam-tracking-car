/**
 * Person card component.
 *
 * Displays an enrolled person with thumbnail, name, and actions.
 */
'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import type { EnrolledPerson } from '@/types/enrollment.ts';
import { TargetBadge } from './target-badge.tsx';

interface PersonCardProps {
    person: EnrolledPerson;
    isTarget: boolean;
    onSetTarget: () => void;
    onRemove: () => Promise<boolean>;
}

export function PersonCard({
    person,
    isTarget,
    onSetTarget,
    onRemove,
}: PersonCardProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = useCallback(async () => {
        setIsRemoving(true);
        const success = await onRemove();
        if (!success) {
            setIsRemoving(false);
            setShowConfirm(false);
        }
    }, [onRemove]);

    // Format date
    const createdDate = new Date(person.created_at).toLocaleDateString();

    return (
        <div className='flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700'>
            {/* Thumbnail */}
            <div className='flex-shrink-0'>
                {person.thumbnail_base64 ? (
                    <Image
                        src={`data:image/jpeg;base64,${person.thumbnail_base64}`}
                        alt={person.name}
                        width={64}
                        height={64}
                        unoptimized
                        className='w-16 h-16 rounded-lg object-cover'
                    />
                ) : (
                    <div className='w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center'>
                        <svg
                            className='w-8 h-8 text-gray-500'
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
                                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                    <h3 className='text-white font-medium truncate'>
                        {person.name}
                    </h3>
                    {isTarget && <TargetBadge />}
                </div>
                <p className='text-gray-400 text-sm'>Added {createdDate}</p>
            </div>

            {/* Actions */}
            <div className='flex-shrink-0 flex items-center gap-2'>
                {!isTarget && (
                    <button
                        type='button'
                        onClick={onSetTarget}
                        className='px-3 py-1.5 text-sm bg-green-600/20 hover:bg-green-600/30
                                   text-green-400 rounded-lg transition-colors'
                        title='Set as tracking target'
                    >
                        Set Target
                    </button>
                )}

                {!showConfirm ? (
                    <button
                        type='button'
                        onClick={() => setShowConfirm(true)}
                        className='p-1.5 text-gray-400 hover:text-red-400 transition-colors'
                        title='Remove person'
                        aria-label={`Remove ${person.name}`}
                    >
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
                                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                            />
                        </svg>
                    </button>
                ) : (
                    <div className='flex items-center gap-1'>
                        <button
                            type='button'
                            onClick={handleRemove}
                            disabled={isRemoving}
                            className='px-2 py-1 text-sm bg-red-600 hover:bg-red-500
                                       disabled:bg-red-800 disabled:cursor-not-allowed
                                       text-white rounded transition-colors'
                        >
                            {isRemoving ? '...' : 'Delete'}
                        </button>
                        <button
                            type='button'
                            onClick={() => setShowConfirm(false)}
                            disabled={isRemoving}
                            className='px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500
                                       text-white rounded transition-colors'
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
