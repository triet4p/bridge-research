/**
 * @fileoverview Custom hook for managing AI configuration (LM Settings).
 * 
 * This module provides a `useLMSettings` hook that encapsulates the logic for:
 * - Fetching the current AI settings from the backend.
 * - Updating the settings (active provider, models, API keys).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { LMSettingResponse, LMSettingUpdate } from '../types/api';
import { useAppStore } from '../stores/useAppStore';

/**
 * The raw API-calling function to fetch LM settings.
 * This is intended for internal use by the `useLMSettings` hook.
 * @returns A promise that resolves to the `LMSettingResponse` object.
 */
const fetchSettings = async (): Promise<LMSettingResponse> => {
    const { data } = await apiClient.get<LMSettingResponse>('/lm_settings/');
    return data;
};

/**
 * A comprehensive hook for managing all aspects of LM Settings.
 * 
 * It combines a `useQuery` for fetching data and a `useMutation` for updating it.
 * The query is conditionally enabled to only run when the settings modal is open,
 * preventing unnecessary API calls on app startup.
 * 
 * @returns An object containing the `useQuery` result (`data`, `isLoading`, etc.)
 *          and the `updateMutation` object for dispatching updates.
 */
export const useLMSettings = () => {
    const queryClient = useQueryClient();
    const { isSettingsOpen, isBackendReady } = useAppStore();

    /**
     * The query object for fetching settings.
     */
    const query = useQuery({
        queryKey: ['lm_settings'],
        queryFn: fetchSettings,
        
        // Configuration to ensure data is always fresh when the modal is opened:
        staleTime: 0, // Data is considered stale immediately.
        refetchOnMount: true, // Force a refetch every time the component using this hook mounts.
        
        // The query is only active when the backend is ready AND the settings modal is open.
        enabled: isBackendReady && isSettingsOpen,
    });

    /**
     * The mutation object for updating settings.
     */
    const updateMutation = useMutation({
        mutationFn: async (payload: LMSettingUpdate) => {
            const { data } = await apiClient.put<LMSettingResponse>('/lm_settings/', payload);
            return data;
        },
        onSuccess: (newData) => {
            // After a successful update, we manually update the query cache with the
            // new data returned from the server. This provides an instant UI update
            // without waiting for a background refetch.
            queryClient.setQueryData(['lm_settings'], newData);
            
            // We also invalidate the query to ensure that if any other component
            // depends on this data, it will also be updated.
            queryClient.invalidateQueries({ queryKey: ['lm_settings'] });
        }
    });

    // Return both the query and mutation objects for use in components.
    return { ...query, updateMutation };
};