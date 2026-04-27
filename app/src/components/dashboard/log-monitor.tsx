/**
 * LogMonitor — collapsible terminal drawer that streams /rosout log entries.
 *
 * @remarks
 * Subscribes to the `/rosout` topic (rcl_interfaces/Log) via the `useTopic`
 * hook and maintains a circular buffer of up to 100 entries.  Entries are
 * colour-coded by severity and filterable by level.  The panel auto-scrolls
 * to the latest entry unless the user has manually scrolled upward.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import { cn } from '@/lib/utils.ts';
import { type Log, LogLevel } from '@/types/ros-messages.ts';

const MAX_ENTRIES = 100;

type FilterLevel = 'ALL' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry extends Log {
    id: number;
}

const levelLabel: Record<number, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL',
};

const levelColorClass: Record<number, string> = {
    [LogLevel.DEBUG]: 'text-slate-500',
    [LogLevel.INFO]: 'text-slate-300',
    [LogLevel.WARN]: 'text-yellow-400',
    [LogLevel.ERROR]: 'text-red-400',
    [LogLevel.FATAL]: 'text-red-600',
};

function formatTimestamp(stamp: { sec: number; nanosec: number }): string {
    const ms = stamp.sec * 1000 + Math.floor(stamp.nanosec / 1_000_000);
    const d = new Date(ms);
    return d.toISOString().slice(11, 23);
}

function meetsFilter(entry: LogEntry, filter: FilterLevel): boolean {
    if (filter === 'ALL') return true;
    if (filter === 'INFO')
        return entry.level >= LogLevel.INFO && entry.level < LogLevel.WARN;
    if (filter === 'WARN')
        return entry.level >= LogLevel.WARN && entry.level < LogLevel.ERROR;
    if (filter === 'ERROR') return entry.level >= LogLevel.ERROR;
    return true;
}

interface LogMonitorProps {
    open: boolean;
}

/**
 * Collapsible log drawer that receives ROS /rosout messages.
 *
 * @param open - Whether the drawer is visible.
 */
export function LogMonitor({ open }: LogMonitorProps) {
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<FilterLevel>('ALL');
    const userScrolledUpRef = useRef(false);
    const scrollRef = useRef<HTMLElement>(null);
    const entryIdRef = useRef(0);

    const handleLog = useCallback((msg: Log) => {
        setEntries((prev) => {
            const next = [...prev, { ...msg, id: ++entryIdRef.current }];
            return next.length > MAX_ENTRIES
                ? next.slice(next.length - MAX_ENTRIES)
                : next;
        });
        requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el && !userScrolledUpRef.current) {
                el.scrollTop = el.scrollHeight;
            }
        });
    }, []);

    useTopic<Log>('/rosout', 'rcl_interfaces/Log', handleLog, {
        throttleRate: 0,
        queueSize: 100,
    });

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
        userScrolledUpRef.current = !atBottom;
    }, []);

    const handleMouseUp = useCallback(() => {
        const selected = window.getSelection()?.toString()?.trim();
        if (!selected) return;
        navigator.clipboard?.writeText(selected).catch(() => {});
    }, []);

    const filteredEntries = entries.filter((e) => meetsFilter(e, filter));

    const filterButtons: FilterLevel[] = ['ALL', 'INFO', 'WARN', 'ERROR'];

    return (
        <div
            className={cn(
                'w-full overflow-hidden transition-all duration-200 ease-in-out',
                'border-t border-border/40 bg-slate-950',
                open ? 'h-[250px]' : 'h-0',
            )}
            aria-label='ROS log monitor'
            role='log'
            aria-live='polite'
        >
            <div className='flex h-full flex-col'>
                <div
                    className={cn(
                        'flex shrink-0 items-center gap-2 px-3 py-1',
                        'border-b border-border/30 bg-slate-900',
                    )}
                >
                    <span className='font-mono text-xs font-semibold text-slate-400'>
                        /rosout
                    </span>
                    <div className='flex gap-1 ml-2'>
                        {filterButtons.map((level) => (
                            <button
                                key={level}
                                type='button'
                                onClick={() => setFilter(level)}
                                className={cn(
                                    'rounded px-2 py-0.5 font-mono text-[10px] font-medium transition-colors',
                                    filter === level
                                        ? 'bg-slate-600 text-slate-100'
                                        : 'text-slate-500 hover:text-slate-300',
                                )}
                                aria-pressed={filter === level}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                    <span className='ml-auto font-mono text-[10px] text-slate-600'>
                        {filteredEntries.length} entries
                    </span>
                </div>

                <section
                    ref={scrollRef}
                    onScroll={handleScroll}
                    onMouseUp={handleMouseUp}
                    aria-label='Log scroll area'
                    className='flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px] leading-5'
                >
                    {filteredEntries.length === 0 && (
                        <span className='text-slate-600'>
                            No log entries yet.
                        </span>
                    )}
                    {filteredEntries.map((entry) => (
                        <div key={entry.id} className='flex gap-2'>
                            <span className='shrink-0 text-slate-600'>
                                {formatTimestamp(entry.stamp)}
                            </span>
                            <span
                                className={cn(
                                    'w-10 shrink-0 font-semibold',
                                    levelColorClass[entry.level]
                                        ?? 'text-slate-300',
                                )}
                            >
                                {levelLabel[entry.level] ?? String(entry.level)}
                            </span>
                            <span className='shrink-0 text-slate-500'>
                                [{entry.name}]
                            </span>
                            <span
                                className={cn(
                                    'min-w-0 break-words',
                                    levelColorClass[entry.level]
                                        ?? 'text-slate-300',
                                )}
                            >
                                {entry.msg}
                            </span>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
