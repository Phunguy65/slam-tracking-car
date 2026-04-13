/**
 * HUD Panel component - glassmorphic, collapsible panel for overlay UI.
 */
'use client';

import { ChevronUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils.ts';

interface HudPanelProps {
    /** Panel title */
    title: string;
    /** Icon to show in header and collapsed state */
    icon?: ReactNode;
    /** Panel content */
    children: ReactNode;
    /** Whether panel starts collapsed */
    defaultCollapsed?: boolean;
    /** Whether panel can be collapsed (default: true) */
    collapsible?: boolean;
    /** Additional className for the panel */
    className?: string;
    /** Additional className for the content area */
    contentClassName?: string;
}

export function HudPanel({
    title,
    icon,
    children,
    defaultCollapsed = false,
    collapsible = true,
    className,
    contentClassName,
}: HudPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    // Collapsed state - show icon pill only
    if (isCollapsed && collapsible) {
        return (
            <button
                type='button'
                onClick={() => setIsCollapsed(false)}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    'bg-background/70 backdrop-blur-md',
                    'border border-border/40 shadow-lg',
                    'text-sm font-medium text-foreground/80',
                    'hover:bg-background/80 hover:text-foreground',
                    'transition-colors',
                    className,
                )}
                title={`Expand ${title}`}
            >
                {icon}
                <span className='sr-only'>{title}</span>
            </button>
        );
    }

    // Expanded state - full panel
    return (
        <div
            className={cn(
                'rounded-lg overflow-hidden',
                'bg-background/70 backdrop-blur-md',
                'border border-border/40 shadow-lg',
                className,
            )}
        >
            {/* Header */}
            <div className='flex items-center justify-between px-3 py-2 border-b border-border/30'>
                <div className='flex items-center gap-2 text-sm font-medium text-foreground/90'>
                    {icon}
                    <span>{title}</span>
                </div>
                {collapsible && (
                    <button
                        type='button'
                        onClick={() => setIsCollapsed(true)}
                        className={cn(
                            'p-1 rounded',
                            'text-muted-foreground hover:text-foreground',
                            'hover:bg-background/50',
                            'transition-colors',
                        )}
                        title={`Collapse ${title}`}
                    >
                        <ChevronUp className='size-4' />
                        <span className='sr-only'>Collapse</span>
                    </button>
                )}
            </div>

            {/* Content */}
            <div className={cn('p-3', contentClassName)}>{children}</div>
        </div>
    );
}
