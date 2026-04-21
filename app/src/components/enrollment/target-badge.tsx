/**
 * Target badge component.
 *
 * Shows an indicator when a person is the active tracking target.
 */
'use client';

export function TargetBadge() {
    return (
        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium'>
            <svg
                className='w-3 h-3'
                fill='currentColor'
                viewBox='0 0 20 20'
                aria-hidden='true'
                focusable='false'
            >
                <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                />
            </svg>
            Target
        </span>
    );
}
