/**
 * LogMonitor — collapsible terminal drawer that streams /rosout log entries.
 *
 * @remarks
 * Subscribes to the `/rosout` topic (rcl_interfaces/Log) via the `useTopic`
 * hook and maintains a circular buffer of up to 100 entries.  Entries are
 * colour-coded by severity and filterable by level and search text.  The panel
 * auto-scrolls to the latest entry unless the user has manually scrolled
 * upward.  Selecting text and releasing the mouse copies the selection to the
 * clipboard and shows a brief inline toast.  The stream can be paused; new
 * entries accumulate in a buffer ref and are flushed to state on resume.
 */
'use client';

import { Pause, Play, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

function meetsSearch(entry: LogEntry, search: string): boolean {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
        entry.msg.toLowerCase().includes(lower)
        || entry.name.toLowerCase().includes(lower)
    );
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
    const [search, setSearch] = useState('');
    const [paused, setPaused] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const userScrolledUpRef = useRef(false);
    const scrollRef = useRef<HTMLElement>(null);
    const entryIdRef = useRef(0);
    const pausedRef = useRef(false);
    const pauseBufferRef = useRef<LogEntry[]>([]);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        pausedRef.current = paused;
        if (!paused) {
            const buffered = pauseBufferRef.current;
            pauseBufferRef.current = [];
            if (buffered.length > 0) {
                setEntries((prev) => {
                    const next = [...prev, ...buffered];
                    return next.length > MAX_ENTRIES
                        ? next.slice(next.length - MAX_ENTRIES)
                        : next;
                });
            }
        }
    }, [paused]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const handleLog = useCallback((msg: Log) => {
        const entry: LogEntry = { ...msg, id: ++entryIdRef.current };
        if (pausedRef.current) {
            pauseBufferRef.current = [...pauseBufferRef.current, entry];
            return;
        }
        setEntries((prev) => {
            const next = [...prev, entry];
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

    const triggerCopyToast = useCallback(() => {
        setShowToast(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setShowToast(false);
        }, 2000);
    }, []);

    const handleMouseUp = useCallback(() => {
        const selected = window.getSelection()?.toString()?.trim();
        if (!selected) return;
        navigator.clipboard
            ?.writeText(selected)
            .then(triggerCopyToast)
            .catch(() => {});
    }, [triggerCopyToast]);

    const handleClear = useCallback(() => {
        setEntries([]);
        pauseBufferRef.current = [];
    }, []);

    const handleTogglePause = useCallback(() => {
        setPaused((prev) => !prev);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearch('');
    }, []);

    const filteredEntries = entries.filter(
        (e) => meetsFilter(e, filter) && meetsSearch(e, search),
    );

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

                    <div className='flex items-center gap-1 ml-2 flex-1 min-w-0'>
                        <div className='relative flex items-center flex-1 min-w-0 max-w-[160px]'>
                            <Search className='absolute left-1.5 size-3 text-slate-500 pointer-events-none' />
                            <input
                                type='text'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder='Search…'
                                aria-label='Search log entries'
                                className={cn(
                                    'w-full rounded bg-slate-800 pl-6 pr-5 py-0.5',
                                    'font-mono text-[10px] text-slate-300 placeholder-slate-600',
                                    'border border-border/20 focus:outline-none focus:border-border/60',
                                )}
                            />
                            {search && (
                                <button
                                    type='button'
                                    onClick={handleClearSearch}
                                    className='absolute right-1 p-0.5 text-slate-500 hover:text-slate-300 transition-colors'
                                    aria-label='Clear search'
                                >
                                    <X className='size-3' />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className='flex items-center gap-1 ml-auto'>
                        <button
                            type='button'
                            onClick={handleTogglePause}
                            className={cn(
                                'flex items-center gap-1 rounded px-1.5 py-0.5',
                                'font-mono text-[10px] transition-colors',
                                paused
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : 'text-slate-500 hover:text-slate-300',
                            )}
                            aria-pressed={paused}
                            title={paused ? 'Resume log' : 'Pause log'}
                        >
                            {paused ? (
                                <Play className='size-3' />
                            ) : (
                                <Pause className='size-3' />
                            )}
                        </button>

                        <button
                            type='button'
                            onClick={handleClear}
                            className='flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-500 hover:text-slate-300 transition-colors'
                            title='Clear log'
                            aria-label='Clear log entries'
                        >
                            <Trash2 className='size-3' />
                        </button>

                        <span className='font-mono text-[10px] text-slate-600'>
                            {filteredEntries.length} entries
                        </span>
                    </div>
                </div>

                <div className='relative flex-1 min-h-0'>
                    <section
                        ref={scrollRef}
                        onScroll={handleScroll}
                        onMouseUp={handleMouseUp}
                        aria-label='Log scroll area'
                        className='h-full overflow-y-auto px-3 py-1 font-mono text-[11px] leading-5'
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
                                    {levelLabel[entry.level]
                                        ?? String(entry.level)}
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

                    {showToast && (
                        <div
                            className={cn(
                                'absolute bottom-2 left-1/2 -translate-x-1/2',
                                'px-3 py-1 rounded-md',
                                'bg-slate-700/90 border border-border/40',
                                'font-mono text-[10px] text-slate-200',
                                'pointer-events-none select-none',
                                'animate-minimap-in',
                            )}
                            role='status'
                            aria-live='polite'
                        >
                            Copied!
                        </div>
                    )}

                    {paused && (
                        <div
                            className={cn(
                                'absolute top-1 right-2',
                                'px-2 py-0.5 rounded',
                                'bg-yellow-400/10 border border-yellow-400/30',
                                'font-mono text-[10px] text-yellow-400',
                                'pointer-events-none select-none',
                            )}
                            role='status'
                            aria-live='polite'
                        >
                            PAUSED
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
