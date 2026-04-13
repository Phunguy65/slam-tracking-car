/**
 * Header component with logo, mode tabs, connection status, and emergency stop.
 */
'use client';

import { ConnectionStatus } from '@/components/ros/connection-status.tsx';
import { EmergencyStop } from '@/components/ros/emergency-stop.tsx';
import { ModeSelector } from './mode-selector.tsx';

export function Header() {
    return (
        <header className='sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
            <div className='flex h-14 items-center px-4 gap-4'>
                {/* Logo */}
                <div className='flex items-center gap-2 mr-4'>
                    <div className='h-8 w-8 rounded bg-primary flex items-center justify-center'>
                        <span className='text-primary-foreground font-bold text-sm'>
                            SC
                        </span>
                    </div>
                    <span className='font-semibold hidden sm:inline'>
                        SLAM Car
                    </span>
                </div>

                {/* Mode Tabs */}
                <ModeSelector />

                {/* Spacer */}
                <div className='flex-1' />

                {/* Status and Controls */}
                <div className='flex items-center gap-3'>
                    <ConnectionStatus />
                    <EmergencyStop />
                </div>
            </div>
        </header>
    );
}
