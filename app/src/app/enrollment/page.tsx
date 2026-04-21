/**
 * Enrollment page for managing tracked persons.
 *
 * Features:
 * - Webcam capture for face enrollment
 * - Scan animation and status display
 * - List of enrolled persons
 * - Set tracking target
 */
'use client';

import { EnrollForm } from '@/components/enrollment/enroll-form.tsx';
import { FaceStatus } from '@/components/enrollment/face-status.tsx';
import { PersonList } from '@/components/enrollment/person-list.tsx';
import { ScanOverlay } from '@/components/enrollment/scan-overlay.tsx';
import { WebcamCapture } from '@/components/enrollment/webcam-capture.tsx';
import { ConnectionStatus } from '@/components/ros/connection-status.tsx';
import { useEnrollment } from '@/hooks/use-enrollment.ts';

export default function EnrollmentPage() {
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

    return (
        <main className='min-h-screen bg-gray-900 text-white'>
            {/* Header */}
            <header className='border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10'>
                <div className='container mx-auto px-4 py-4 flex items-center justify-between'>
                    <h1 className='text-xl font-bold'>Person Enrollment</h1>
                    <ConnectionStatus />
                </div>
            </header>

            <div className='container mx-auto px-4 py-8'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    {/* Left column: Camera + Enrollment */}
                    <div className='space-y-6'>
                        <div className='bg-gray-800/50 rounded-xl p-4 border border-gray-700'>
                            <h2 className='text-lg font-semibold mb-4'>
                                Capture Face
                            </h2>

                            {/* Webcam with overlays */}
                            <WebcamCapture>
                                <ScanOverlay
                                    status={status?.status ?? 0}
                                    faceBbox={status?.face_bbox ?? null}
                                    progress={status?.scan_progress ?? 0}
                                />
                            </WebcamCapture>

                            {/* Status bar */}
                            <div className='mt-4 flex justify-center'>
                                <FaceStatus status={status?.status ?? null} />
                            </div>
                        </div>

                        {/* Enrollment form */}
                        <div className='bg-gray-800/50 rounded-xl p-4 border border-gray-700'>
                            <h2 className='text-lg font-semibold mb-4'>
                                Add Person
                            </h2>
                            <EnrollForm
                                status={status?.status ?? null}
                                enrollName={enrollName}
                                onNameChange={setEnrollName}
                                onSubmit={addPerson}
                                isLoading={isLoading}
                                error={error}
                            />
                        </div>
                    </div>

                    {/* Right column: Enrolled persons */}
                    <div className='bg-gray-800/50 rounded-xl p-4 border border-gray-700'>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-lg font-semibold'>
                                Enrolled Persons
                            </h2>
                            <span className='text-gray-400 text-sm'>
                                {persons.length}{' '}
                                {persons.length === 1 ? 'person' : 'persons'}
                            </span>
                        </div>

                        <PersonList
                            persons={persons}
                            targetId={targetId}
                            onSetTarget={setTarget}
                            onRemove={removePerson}
                        />
                    </div>
                </div>

                {/* Instructions */}
                <div className='mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700/50'>
                    <h3 className='text-lg font-semibold mb-3'>
                        How to Enroll
                    </h3>
                    <ol className='list-decimal list-inside space-y-2 text-gray-400'>
                        <li>Position your face in the camera frame</li>
                        <li>Wait for the scanning animation to complete</li>
                        <li>Enter a name and click "Add Person"</li>
                        <li>
                            Set a person as the tracking target to follow them
                        </li>
                    </ol>
                </div>
            </div>
        </main>
    );
}
