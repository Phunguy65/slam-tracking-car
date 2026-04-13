/**
 * Hook for calling ROS services.
 */
'use client';

import { useCallback, useRef } from 'react';
import type * as ROSLIB from 'roslib';
import { createService, isConnected } from '@/lib/ros-client/index.ts';

interface UseServiceResult<TReq, TRes> {
    /** Call the service with the given request */
    call: (request: TReq) => Promise<TRes>;
    /** Whether a call is currently in progress */
    isPending: boolean;
}

/**
 * Create a service client hook.
 *
 * @param serviceName - Name of the service (e.g., '/slam_toolbox/save_map')
 * @param serviceType - ROS service type (e.g., 'slam_toolbox/SaveMap')
 */
export function useService<TReq, TRes>(
    serviceName: string,
    serviceType: string,
): UseServiceResult<TReq, TRes> {
    const pendingRef = useRef(false);
    const serviceRef = useRef<ROSLIB.Service<TReq, TRes> | null>(null);

    const call = useCallback(
        async (request: TReq): Promise<TRes> => {
            if (!isConnected()) {
                throw new Error('Not connected to rosbridge');
            }

            // Create or reuse service client
            if (!serviceRef.current) {
                serviceRef.current = createService<TReq, TRes>(
                    serviceName,
                    serviceType,
                );
            }

            pendingRef.current = true;

            return new Promise((resolve, reject) => {
                const req = new ROSLIB.ServiceRequest(request);
                const service = serviceRef.current;
                if (!service) {
                    pendingRef.current = false;
                    reject(new Error('Service not initialized'));
                    return;
                }

                service.callService(
                    req,
                    (response: TRes) => {
                        pendingRef.current = false;
                        resolve(response);
                    },
                    (error: string) => {
                        pendingRef.current = false;
                        reject(new Error(error));
                    },
                );
            });
        },
        [serviceName, serviceType],
    );

    return {
        call,
        get isPending() {
            return pendingRef.current;
        },
    };
}

/**
 * Hook for calling set_parameters service on a node.
 *
 * @param nodeName - Name of the node (e.g., 'face_follow_controller')
 */
export function useSetParameters(nodeName: string) {
    const service = useService<
        {
            parameters: Array<{
                name: string;
                value: {
                    type: number;
                    double_value?: number;
                    string_value?: string;
                };
            }>;
        },
        { results: Array<{ successful: boolean; reason: string }> }
    >(`/${nodeName}/set_parameters`, 'rcl_interfaces/srv/SetParameters');

    const setParameter = useCallback(
        async (name: string, value: number | string) => {
            const param = {
                name,
                value:
                    typeof value === 'number'
                        ? { type: 3, double_value: value } // PARAMETER_DOUBLE
                        : { type: 4, string_value: value }, // PARAMETER_STRING
            };

            const response = await service.call({ parameters: [param] });

            if (!response.results[0]?.successful) {
                throw new Error(
                    response.results[0]?.reason || 'Failed to set parameter',
                );
            }

            return response.results[0];
        },
        [service],
    );

    const setParameters = useCallback(
        async (params: Record<string, number | string>) => {
            const parameters = Object.entries(params).map(([name, value]) => ({
                name,
                value:
                    typeof value === 'number'
                        ? { type: 3, double_value: value }
                        : { type: 4, string_value: value },
            }));

            const response = await service.call({ parameters });

            const failed = response.results.filter((r) => !r.successful);
            if (failed.length > 0) {
                throw new Error(failed.map((f) => f.reason).join(', '));
            }

            return response.results;
        },
        [service],
    );

    return {
        setParameter,
        setParameters,
        isPending: service.isPending,
    };
}
