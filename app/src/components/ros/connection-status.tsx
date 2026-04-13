/**
 * Connection status badge component.
 *
 * Shows rosbridge connection state with visual indicator.
 */
'use client';

import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { useRosStore } from '@/stores/ros-store.ts';

export function ConnectionStatus() {
    const status = useRosStore((s) => s.status);

    const statusConfig = {
        connected: {
            label: 'Connected',
            variant: 'default' as const,
            dotClass: 'bg-green-500',
        },
        connecting: {
            label: 'Connecting...',
            variant: 'secondary' as const,
            dotClass: 'bg-yellow-500 animate-pulse',
        },
        disconnected: {
            label: 'Disconnected',
            variant: 'destructive' as const,
            dotClass: 'bg-red-500 animate-pulse',
        },
        error: {
            label: 'Error',
            variant: 'destructive' as const,
            dotClass: 'bg-red-500',
        },
    };

    const config = statusConfig[status];

    return (
        <Badge variant={config.variant} className='gap-1.5 font-mono text-xs'>
            <span
                className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    config.dotClass,
                )}
                aria-hidden='true'
            />
            {config.label}
        </Badge>
    );
}
