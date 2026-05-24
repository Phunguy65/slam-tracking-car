/**
 * Person overlay component that draws tracked-person bounding boxes.
 */
'use client';

import { useCallback, useState } from 'react';
import { useTopic } from '@/hooks/use-topic.ts';
import type { BoundingBox2D, TrackedPersonArray } from '@/types/enrollment.ts';

const TARGET_STROKE = '#fb923c';
const DEFAULT_STROKE = '#60a5fa';
const FACE_STROKE = '#fde047';

export function PersonOverlay() {
    const [persons, setPersons] = useState<TrackedPersonArray['persons']>([]);

    const handleTrackedPersons = useCallback((msg: TrackedPersonArray) => {
        setPersons(msg.persons);
    }, []);

    useTopic<TrackedPersonArray>(
        '/tracked_persons',
        'slam_car_interfaces/msg/TrackedPersonArray',
        handleTrackedPersons,
    );

    return (
        <svg
            className='absolute inset-0 h-full w-full pointer-events-none'
            data-testid='person-overlay'
            preserveAspectRatio='none'
            viewBox='0 0 1 1'
        >
            <title>Tracked persons overlay</title>
            {persons.map((person, index) => {
                const body = toRect(person.body_bbox);
                const stroke = person.is_target
                    ? TARGET_STROKE
                    : DEFAULT_STROKE;
                const strokeWidth = person.is_target ? 0.006 : 0.003;
                const key = person.person_id || `person-${index}`;
                const rangeVisible = Number.isFinite(person.range_m);

                return (
                    <g key={key} data-testid='tracked-person'>
                        <rect
                            data-testid='body-bbox'
                            x={body.x}
                            y={body.y}
                            width={body.width}
                            height={body.height}
                            fill={`${stroke}22`}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            vectorEffect='non-scaling-stroke'
                        />
                        {person.face_visible && (
                            <rect
                                data-testid='face-bbox'
                                {...toRect(person.face_bbox)}
                                fill='transparent'
                                stroke={FACE_STROKE}
                                strokeDasharray='0.01 0.01'
                                strokeWidth={0.002}
                                vectorEffect='non-scaling-stroke'
                            />
                        )}
                        {rangeVisible && (
                            <text
                                data-testid='range-label'
                                x={body.x}
                                y={Math.max(0.03, body.y - 0.02)}
                                fill={stroke}
                                fontSize='0.035'
                                fontWeight='700'
                                stroke='black'
                                strokeWidth='0.004'
                                paintOrder='stroke'
                            >
                                {person.range_m.toFixed(1)} m
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function toRect(bbox: BoundingBox2D) {
    return {
        x: bbox.center_x - bbox.width / 2,
        y: bbox.center_y - bbox.height / 2,
        width: bbox.width,
        height: bbox.height,
    };
}
