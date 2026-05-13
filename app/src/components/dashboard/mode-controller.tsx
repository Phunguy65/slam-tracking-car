/**
 * Mode controller component for dashboard primary and submode switching.
 *
 * Provides segmented controls for SLAM mode and submodes.
 */
'use client';

import { Compass, Map as MapIcon, Navigation } from 'lucide-react';
import { useCallback } from 'react';
import { Switch } from '@/components/ui/switch.tsx';
import { useTopic } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import {
    type PrimaryMode,
    type SlamSubmode,
    useDashboardStore,
} from '@/stores/dashboard-store.ts';
import { useExploreStore } from '@/stores/explore-store.ts';
import { useModeStore } from '@/stores/mode-store.ts';
import { useNavStore } from '@/stores/nav-store.ts';
import { ExploreState, type ExploreStatus } from '@/types/ros-messages.ts';

interface ModeControllerProps {
    disabled?: boolean;
}

export function ModeController({ disabled = false }: ModeControllerProps) {
    const primaryMode = useDashboardStore((s) => s.primaryMode);
    const slamSubmode = useDashboardStore((s) => s.slamSubmode);
    const setPrimaryMode = useDashboardStore((s) => s.setPrimaryMode);
    const setSlamSubmode = useDashboardStore((s) => s.setSlamSubmode);
    const setAutoExplore = useDashboardStore((s) => s.setAutoExplore);

    const { setMode: setRosMode, isSwitching, clearError } = useModeStore();
    const cancelNav = useNavStore((s) => s.cancel);
    const { sendGoal: startExplore, cancel: stopExplore } = useExploreStore();

    const isMappingActive = primaryMode === 'slam' && slamSubmode === 'mapping';
    const autoExplore = useDashboardStore((s) => s.autoExplore);

    useTopic<ExploreStatus>(
        '/explore/status',
        'explore_lite_msgs/ExploreStatus',
        (message) => {
            setAutoExplore(message.status === ExploreState.EXPLORING);
        },
        { enabled: isMappingActive },
    );

    const handlePrimaryModeChange = useCallback(
        (mode: PrimaryMode) => {
            if (mode === primaryMode || disabled) return;
            setPrimaryMode(mode);
            clearError();
        },
        [primaryMode, disabled, setPrimaryMode, clearError],
    );

    const handleSlamSubmodeChange = useCallback(
        async (submode: SlamSubmode) => {
            if (submode === slamSubmode || disabled) return;

            const rosMode = submode === 'mapping' ? 'mapping' : 'navigation';
            const success = await setRosMode(rosMode);
            if (success) {
                setSlamSubmode(submode);
            }
        },
        [slamSubmode, disabled, setRosMode, setSlamSubmode],
    );

    const handleAutoExploreToggle = useCallback(
        (enabled: boolean) => {
            if (!enabled) {
                stopExplore();
                cancelNav();
            } else {
                startExplore();
            }
            setAutoExplore(enabled);
        },
        [startExplore, stopExplore, cancelNav, setAutoExplore],
    );

    const isSlam = primaryMode === 'slam';

    return (
        <div className='flex flex-col gap-2'>
            <div
                className={cn(
                    'flex items-center gap-1 p-1 rounded-lg',
                    'bg-background/70 backdrop-blur-md',
                    'border border-border/40 shadow-lg',
                )}
                role='tablist'
                aria-label='Primary mode selection'
            >
                <ModeButton
                    active={primaryMode === 'slam'}
                    disabled={disabled}
                    onClick={() => handlePrimaryModeChange('slam')}
                    icon={<MapIcon className='size-4' />}
                    label='SLAM'
                    shortcut='1'
                />
            </div>

            {isSlam && (
                <div
                    className={cn(
                        'flex items-center gap-1 p-1 rounded-lg',
                        'bg-background/70 backdrop-blur-md',
                        'border border-border/40 shadow-lg',
                    )}
                    role='tablist'
                    aria-label='SLAM submode selection'
                >
                    <ModeButton
                        active={slamSubmode === 'mapping'}
                        disabled={disabled || isSwitching}
                        onClick={() => handleSlamSubmodeChange('mapping')}
                        icon={<MapIcon className='size-4' />}
                        label='Mapping'
                    />
                    <ModeButton
                        active={slamSubmode === 'navigation'}
                        disabled={disabled || isSwitching}
                        onClick={() => handleSlamSubmodeChange('navigation')}
                        icon={<Navigation className='size-4' />}
                        label='Navigation'
                    />
                </div>
            )}

            {isSlam && slamSubmode === 'mapping' && (
                <div
                    className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 rounded-lg',
                        'bg-background/70 backdrop-blur-md',
                        'border border-border/40 shadow-lg',
                    )}
                >
                    <div className='flex items-center gap-2'>
                        <Compass className='size-4 text-muted-foreground' />
                        <span className='text-sm font-medium'>
                            Auto Explore
                        </span>
                    </div>
                    <Switch
                        checked={autoExplore}
                        onCheckedChange={handleAutoExploreToggle}
                        disabled={disabled}
                        aria-label='Toggle auto exploration'
                    />
                </div>
            )}
        </div>
    );
}

interface ModeButtonProps {
    active: boolean;
    disabled: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
}

function ModeButton({
    active,
    disabled,
    onClick,
    icon,
    label,
    shortcut,
}: ModeButtonProps) {
    return (
        <button
            type='button'
            role='tab'
            aria-selected={active}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md',
                'text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                disabled && 'opacity-50 pointer-events-none',
            )}
            title={shortcut ? `${label} (${shortcut})` : label}
        >
            {icon}
            <span>{label}</span>
            {shortcut && (
                <kbd className='hidden sm:inline-block ml-1 px-1 py-0.5 text-xs bg-background/50 rounded'>
                    {shortcut}
                </kbd>
            )}
        </button>
    );
}
