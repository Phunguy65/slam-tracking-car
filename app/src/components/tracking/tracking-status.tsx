/**
 * Tracking status component showing controller state and target range.
 */
'use client';

import { AlertTriangle } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { useEnrollmentStore } from '@/stores/enrollment-store.ts';
import { useRosStore } from '@/stores/ros-store.ts';
import {
    parseTrackingControllerStatus,
    type TrackingControllerStatus,
} from '@/types/enrollment.ts';

interface StringMessage {
    data: string;
}

let parseWarningLogged = false;

export function TrackingStatus() {
    const isConnected = useRosStore((s) => s.status === 'connected');
    const persons = useEnrollmentStore((s) => s.persons);
    const [status, setStatus] = useState<TrackingControllerStatus | null>(null);
    const [parseFailed, setParseFailed] = useState(false);
    const hasMessage = useRef(false);

    const handleStatus = useCallback((msg: StringMessage) => {
        hasMessage.current = true;
        const parsed = parseTrackingControllerStatus(msg.data);

        if (!parsed) {
            setStatus(null);
            setParseFailed(true);
            if (!parseWarningLogged) {
                parseWarningLogged = true;
                console.warn('[TrackingStatus] Invalid controller status JSON');
            }
            return;
        }

        setParseFailed(false);
        setStatus(parsed);
    }, []);

    useTopic<StringMessage>(
        '/tracking_controller/status',
        'std_msgs/String',
        handleStatus,
    );

    if (!isConnected) {
        return (
            <div
                className='space-y-2 text-sm'
                data-testid='tracking-status-disconnected'
            >
                <div className='text-muted-foreground'>Disconnected</div>
            </div>
        );
    }

    if (!hasMessage.current) {
        return (
            <div
                className='space-y-2 text-sm'
                data-testid='tracking-status-loading'
            >
                <div className='text-muted-foreground'>Loading…</div>
            </div>
        );
    }

    if (parseFailed || !status) {
        return (
            <div
                className='space-y-2 text-sm'
                data-testid='tracking-status-unavailable'
            >
                <div className='text-destructive'>Status: unavailable</div>
            </div>
        );
    }

    const targetName = status.target_id
        ? (persons.find((person) => person.person_id === status.target_id)?.name
          ?? status.target_id)
        : '—';
    const rangeText = Number.isFinite(status.range_m)
        ? `${status.range_m?.toFixed(1)} m`
        : '—';

    return (
        <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
                <span className='text-muted-foreground'>State</span>
                <span className='rounded-full bg-primary/20 px-2 py-0.5 font-data font-medium uppercase text-primary'>
                    {status.state}
                </span>
            </div>
            <div className='flex justify-between'>
                <span className='text-muted-foreground'>Target</span>
                <span className='font-data font-medium'>{targetName}</span>
            </div>
            <div className='flex justify-between'>
                <span className='text-muted-foreground'>Range</span>
                <span className='font-data font-medium'>{rangeText}</span>
            </div>
            {status.obstacle && (
                <div className='flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-300'>
                    <AlertTriangle className='size-4' />
                    <span>Obstacle</span>
                </div>
            )}
        </div>
    );
}
