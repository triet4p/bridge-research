import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { LMSettingResponse, LMSettingUpdate } from '../types/api';
import { useAppStore } from '../stores/useAppStore';

// Fetcher
const fetchSettings = async (): Promise<LMSettingResponse> => {
    const { data } = await apiClient.get<LMSettingResponse>('/lm_settings/');
    return data;
};

export const useLMSettings = () => {
    const queryClient = useQueryClient();
    const { isSettingsOpen, isBackendReady } = useAppStore();

    const query = useQuery({
        queryKey: ['lm_settings'],
        queryFn: fetchSettings,
        staleTime: 0, 
        refetchOnMount: true,
        enabled: isBackendReady && isSettingsOpen,
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: LMSettingUpdate) => {
            const { data } = await apiClient.put<LMSettingResponse>('/lm_settings/', payload);
            return data;
        },
        onSuccess: (newData) => {
            // Update cache ngay lập tức
            queryClient.setQueryData(['lm_settings'], newData);
            queryClient.invalidateQueries({ queryKey: ['lm_settings'] });
        }
    });

    return { ...query, updateMutation };
};