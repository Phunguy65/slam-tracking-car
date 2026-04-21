/**
 * Mode selector tabs for switching between Dashboard and legacy modes.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils.ts';

const modes = [
    {
        name: 'Dashboard',
        href: '/dashboard',
        description: 'Unified operator workspace',
    },
    {
        name: 'Tracking',
        href: '/tracking',
        description: 'Person tracking mode (legacy)',
        deprecated: true,
    },
    {
        name: 'Enrollment',
        href: '/enrollment',
        description: 'Enroll persons to track (legacy)',
        deprecated: true,
    },
    {
        name: 'SLAM',
        href: '/slam',
        description: 'Mapping & Navigation (legacy)',
        deprecated: true,
    },
] as const;

export function ModeSelector() {
    const pathname = usePathname();

    return (
        <nav className='flex items-center gap-1 rounded-lg bg-muted p-1'>
            {modes.map((mode) => {
                const isActive = pathname.startsWith(mode.href);
                return (
                    <Link
                        key={mode.href}
                        href={mode.href}
                        className={cn(
                            'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isActive
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                            'deprecated' in mode
                                && mode.deprecated
                                && 'opacity-60',
                        )}
                        title={mode.description}
                    >
                        {mode.name}
                    </Link>
                );
            })}
        </nav>
    );
}
