/**
 * Viewport placeholder for empty, loading, or error states.
 *
 * Displays appropriate messaging and visual feedback for viewport failures.
 */
'use client';

import {
    AlertCircle,
    Camera,
    Loader2,
    Map as MapIcon,
    WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';

type PlaceholderType = 'loading' | 'no-signal' | 'error' | 'empty';
type ViewportType = 'map' | 'camera';

interface ViewportPlaceholderProps {
    type: PlaceholderType;
    viewportType: ViewportType;
    message?: string;
    className?: string;
}

export function ViewportPlaceholder({
    type,
    viewportType,
    message,
    className,
}: ViewportPlaceholderProps) {
    const Icon = viewportType === 'map' ? MapIcon : Camera;

    const content = {
        loading: {
            icon: (
                <Loader2 className='size-12 animate-spin text-muted-foreground' />
            ),
            title: 'Loading...',
            subtitle: `Waiting for ${viewportType} data`,
        },
        'no-signal': {
            icon: <WifiOff className='size-12 text-destructive/70' />,
            title: 'No Signal',
            subtitle:
                message
                ?? `${viewportType === 'map' ? 'Map' : 'Camera'} stream unavailable`,
        },
        error: {
            icon: <AlertCircle className='size-12 text-destructive' />,
            title: 'Error',
            subtitle: message ?? 'Failed to render viewport',
        },
        empty: {
            icon: <Icon className='size-12 text-muted-foreground/50' />,
            title: `No ${viewportType === 'map' ? 'Map' : 'Camera'} Data`,
            subtitle: 'Waiting for stream to start',
        },
    };

    const { icon, title, subtitle } = content[type];

    return (
        <div
            className={cn(
                'absolute inset-0 flex flex-col items-center justify-center',
                'bg-slate-950 text-center',
                className,
            )}
            role='status'
            aria-live='polite'
        >
            {icon}
            <h3 className='mt-4 text-lg font-medium text-foreground/80'>
                {title}
            </h3>
            <p className='mt-1 text-sm text-muted-foreground'>{subtitle}</p>
        </div>
    );
}
