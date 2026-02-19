import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { TrendAnalysis, TrendGenerateRequest, TrendTaskResponse, TrendStatusResponse } from '../types/api';
import { useAppStore } from '../stores/useAppStore';

export const useTrends = () => {
    const queryClient = useQueryClient();
    const [statusData, setStatusData] = useState<TrendStatusResponse | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const { addOperation, removeOperation, activeTrendTaskId, setActiveTrendTaskId } = useAppStore();

    // Lấy lịch sử các đợt phân tích
    const historyQuery = useQuery({
        queryKey: ['trends', 'history'],
        queryFn: async () => {
            const { data } = await apiClient.get<TrendAnalysis[]>('/trends/history');
            return data;
        }
    });

    // 1. Mutation: Start Task
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

    // 2. Server-Sent Events: Real-time Status Updates
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