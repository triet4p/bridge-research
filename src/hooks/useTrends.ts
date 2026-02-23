/**
 * @file useTrends.ts
 * @description Custom hook for managing trend analysis operations.
 *
 * This hook provides functionality for:
 * - Fetching historical trend analyses
 * - Starting new trend generation tasks
 * - Real-time progress tracking via Server-Sent Events (SSE)
 * - Task lifecycle management with operation tracking
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { TrendAnalysis, TrendGenerateRequest, TrendTaskResponse, TrendStatusResponse } from '../types/api';
import { useAppStore } from '../stores/useAppStore';

/**
 * Custom hook for managing trend analysis operations.
 *
 * This hook orchestrates the complete trend analysis workflow:
 * 1. **History Fetching**: Retrieves past trend analyses from the backend.
 * 2. **Task Initiation**: Starts a new trend generation task via API.
 * 3. **SSE Streaming**: Listens to real-time progress updates via Server-Sent Events.
 * 4. **Operation Tracking**: Registers active tasks to prevent health check interference.
 *
 * @returns An object containing query, mutation, and streaming state.
 *
 * @example
 * ```tsx
 * const { historyQuery, startMutation, statusData, isStreaming } = useTrends();
 *
 * // Start a new trend analysis
 * startMutation.mutate({ days: 7, categories: ['cs.AI'] });
 *
 * // Access real-time progress
 * if (isStreaming) {
 *   console.log(`Progress: ${statusData?.progress}% - ${statusData?.message}`);
 * }
 * ```
 */
export const useTrends = () => {
    const queryClient = useQueryClient();
    const [statusData, setStatusData] = useState<TrendStatusResponse | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const { addOperation, removeOperation, activeTrendTaskId, setActiveTrendTaskId } = useAppStore();

    /**
     * Query to fetch the history of all past trend analyses.
     *
     * This query retrieves a list of all previously completed trend analyses
     * from the backend, including their statistical summaries and reports.
     */
    const historyQuery = useQuery({
        queryKey: ['trends', 'history'],
        queryFn: async () => {
            const { data } = await apiClient.get<TrendAnalysis[]>('/trends/history');
            return data;
        }
    });

    /**
     * Mutation to start a new trend generation task.
     *
     * This mutation sends a POST request to the backend to initiate a trend analysis.
     * On success, it sets the task ID to trigger the SSE streaming effect.
     */
    const startMutation = useMutation({
        mutationFn: async (req: TrendGenerateRequest) => {
            const { data } = await apiClient.post<TrendTaskResponse>('/trends/generate', req);
            return data;
        },
        onSuccess: (data) => {
            // Set Task ID to trigger SSE stream
            setActiveTrendTaskId(data.task_id);
            setStatusData(null); // Reset previous status
        }
    });

    /**
     * Effect to establish Server-Sent Events (SSE) connection for real-time progress updates.
     *
     * This effect:
     * 1. Opens an EventSource connection to the SSE endpoint.
     * 2. Registers the operation to prevent health check noise.
     * 3. Listens for 'progress' events and updates the status state.
     * 4. Handles task completion (success/failure) by closing the stream and invalidating the history query.
     * 5. Cleans up the connection on unmount or task ID change.
     *
     * @remarks
     * - Uses the `VITE_API_URL` environment variable or defaults to localhost.
     * - Logs debug information in development mode.
     * - Automatically closes the stream when the task completes or fails.
     */
    useEffect(() => {
        if (!activeTrendTaskId) return;

        const operationId = `trend-${activeTrendTaskId}`;
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const eventSource = new EventSource(`${baseURL}/trends/stream/${activeTrendTaskId}`);

        setIsStreaming(true);
        addOperation(operationId); // Register operation to skip health checks

        if (import.meta.env.DEV) {
            console.log('[Trends SSE] Starting stream for task:', activeTrendTaskId.slice(0, 8));
        }

        eventSource.addEventListener('progress', (event) => {
            try {
                const data: TrendStatusResponse = JSON.parse(event.data);

                if (import.meta.env.DEV) {
                    console.log('[Trends SSE] Progress:', data.status, `${data.progress}%`, data.message);
                }

                setStatusData(data);

                // Handle completion
                if (data.status === 'completed' || data.status === 'failed') {
                    eventSource.close();
                    setIsStreaming(false);
                    removeOperation(operationId); // Unregister operation

                    // Invalidate history to show new item
                    if (data.status === 'completed') {
                        queryClient.invalidateQueries({ queryKey: ['trends', 'history'] });
                    }

                    if (import.meta.env.DEV) {
                        console.log('[Trends SSE] Stream closed:', data.status);
                    }
                }
            } catch (error) {
                console.error('[Trends SSE] Error parsing event:', error);
            }
        });

        eventSource.addEventListener('error', (event) => {
            console.error('[Trends SSE] Connection error:', event);
            eventSource.close();
            setIsStreaming(false);
            removeOperation(operationId); // Unregister on error
        });

        // Cleanup on unmount or when activeTaskId changes
        return () => {
            if (import.meta.env.DEV) {
                console.log('[Trends SSE] Cleanup - closing connection');
            }
            eventSource.close();
            setIsStreaming(false);
            removeOperation(operationId); // Unregister on cleanup
        };
    }, [activeTrendTaskId, queryClient, addOperation, removeOperation, setActiveTrendTaskId]);

    return {
        historyQuery,
        startMutation,
        statusData,
        isStreaming,
        activeTrendTaskId,
        resetPolling: () => {
            setActiveTrendTaskId(null);
            setStatusData(null);
        }
    };
};
