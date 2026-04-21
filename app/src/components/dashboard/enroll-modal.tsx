/**
 * Enrollment modal for managing tracked persons from within the dashboard.
 *
 * Reuses existing enrollment widgets in a modal container.
 */
'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { EnrollForm } from '@/components/enrollment/enroll-form.tsx';
import { FaceStatus } from '@/components/enrollment/face-status.tsx';
import { PersonList } from '@/components/enrollment/person-list.tsx';
import { ScanOverlay } from '@/components/enrollment/scan-overlay.tsx';
import { WebcamCapture } from '@/components/enrollment/webcam-capture.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useEnrollment } from '@/hooks/use-enrollment.ts';
import { cn } from '@/lib/utils.ts';
import { useDashboardStore } from '@/stores/dashboard-store.ts';

interface EnrollModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EnrollModal({ open, onOpenChange }: EnrollModalProps) {
    const {
        status,
        persons,
        targetId,
        enrollName,
        isLoading,
        error,
        setEnrollName,
        addPerson,
        removePerson,
        setTarget,
    } = useEnrollment();

    const setTargetPerson = useDashboardStore((s) => s.setTargetPerson);

    const handleSetTarget = useCallback(
        async (personId: string | null) => {
            const success = await setTarget(personId);
            if (success) {
                setTargetPerson(personId);
            }
            return success;
        },
        [setTarget, setTargetPerson],
    );

    const handleAddPerson = useCallback(async () => {
        if (!enrollName.trim()) return;
        await addPerson(enrollName.trim());
    }, [enrollName, addPerson]);

    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, handleClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center'
            role='dialog'
            aria-modal='true'
            aria-labelledby='enroll-modal-title'
        >
            <div
                className='absolute inset-0 bg-black/60 backdrop-blur-sm'
                onClick={handleClose}
                aria-hidden='true'
            />

            <div
                className={cn(
                    'relative z-10 w-full max-w-4xl max-h-[90vh] overflow-auto',
                    'm-4 rounded-xl',
                    'bg-background border border-border shadow-2xl',
                )}
            >
                <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-background'>
                    <h2
                        id='enroll-modal-title'
                        className='text-lg font-semibold'
                    >
                        Person Enrollment
                    </h2>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={handleClose}
                        aria-label='Close enrollment modal'
                    >
                        <X className='size-5' />
                    </Button>
                </div>

                <div className='p-6 grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    <div className='space-y-6'>
                        <div className='rounded-xl p-4 border border-border bg-card'>
                            <h3 className='text-sm font-semibold mb-4'>
                                Capture Face
                            </h3>
                            <WebcamCapture>
                                <ScanOverlay
                                    status={status?.status ?? 0}
                                    faceBbox={status?.face_bbox ?? null}
                                    progress={status?.scan_progress ?? 0}
                                />
                            </WebcamCapture>
                            <div className='mt-4 flex justify-center'>
                                <FaceStatus status={status?.status ?? null} />
                            </div>
                        </div>

                        <div className='rounded-xl p-4 border border-border bg-card'>
                            <h3 className='text-sm font-semibold mb-4'>
                                Add Person
                            </h3>
                            <EnrollForm
                                status={status?.status ?? null}
                                enrollName={enrollName}
                                onNameChange={setEnrollName}
                                onSubmit={handleAddPerson}
                                isLoading={isLoading}
                                error={error}
                            />
                        </div>
                    </div>

                    <div className='rounded-xl p-4 border border-border bg-card'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-sm font-semibold'>
                                Enrolled Persons
                            </h3>
                            <span className='text-xs text-muted-foreground'>
                                {persons.length}{' '}
                                {persons.length === 1 ? 'person' : 'persons'}
                            </span>
                        </div>
                        <PersonList
                            persons={persons}
                            targetId={targetId}
                            onSetTarget={handleSetTarget}
                            onRemove={removePerson}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
