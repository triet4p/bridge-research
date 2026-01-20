import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { SummaryRequest, SummaryResponse } from '../types/api';

export const useAISummary = () => {
    return useMutation({
        mutationFn: async (req: SummaryRequest) => {
            const { data } = await apiClient.post<SummaryResponse>('/ai/summarize', req, {
                'timeout': 180000,
            });
            return data;
        }
    });
};