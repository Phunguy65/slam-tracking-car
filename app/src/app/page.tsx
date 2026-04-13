/**
 * Landing page - redirects to tracking mode or shows mode selection.
 */
import Link from 'next/link';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';

export default function Home() {
    return (
        <div className='flex-1 flex items-center justify-center p-8'>
            <div className='max-w-2xl w-full space-y-8'>
                <div className='text-center space-y-2'>
                    <h1 className='text-3xl font-bold tracking-tight'>
                        SLAM Tracking Car
                    </h1>
                    <p className='text-muted-foreground'>
                        Select a mode to begin controlling the robot
                    </p>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                    <Link href='/tracking' className='block group'>
                        <Card className='h-full transition-colors group-hover:border-primary'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>
                                    <span className='text-2xl'>👁️</span>
                                    Face Tracking
                                </CardTitle>
                                <CardDescription>
                                    Camera stream with face detection overlay.
                                    Robot follows detected faces with PID
                                    control.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>

                    <Link href='/slam' className='block group'>
                        <Card className='h-full transition-colors group-hover:border-primary'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>
                                    <span className='text-2xl'>🗺️</span>
                                    SLAM & Navigation
                                </CardTitle>
                                <CardDescription>
                                    Map the environment with LiDAR, save maps,
                                    and navigate autonomously to waypoints.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                </div>

                <div className='text-center text-xs text-muted-foreground'>
                    Press{' '}
                    <kbd className='px-1.5 py-0.5 rounded bg-muted font-mono'>
                        Space
                    </kbd>{' '}
                    at any time for emergency stop
                </div>
            </div>
        </div>
    );
}
