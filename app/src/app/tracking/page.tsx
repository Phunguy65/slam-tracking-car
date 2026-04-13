/**
 * Tracking mode page.
 *
 * Displays camera stream with face detection overlay and controls.
 */
'use client';

import { CameraStream } from '@/components/tracking/camera-stream.tsx';
import { FaceOverlay } from '@/components/tracking/face-overlay.tsx';
import { PidTuner } from '@/components/tracking/pid-tuner.tsx';
import { TrackingControls } from '@/components/tracking/tracking-controls.tsx';
import { TrackingStatus } from '@/components/tracking/tracking-status.tsx';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';

export default function TrackingPage() {
    return (
        <div className='flex-1 p-4 grid gap-4 lg:grid-cols-[1fr_320px]'>
            {/* Main camera view */}
            <Card className='overflow-hidden'>
                <CardContent className='p-0 relative aspect-video bg-black'>
                    <CameraStream />
                    <FaceOverlay />
                </CardContent>
            </Card>

            {/* Control panel */}
            <div className='space-y-4'>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-base'>Tracking</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <TrackingControls />
                        <TrackingStatus />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-base'>PID Tuning</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PidTuner />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
