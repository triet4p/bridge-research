/**
 * @fileoverview Custom hooks for fetching and managing Paper data.
 * 
 * This module centralizes all TanStack Query logic related to:
 * - Searching for papers on ArXiv.
 * - Managing the local paper library (fetching, saving, deleting).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { LocalPaper, SearchFilters } from '../types/api';
import { useAppStore } from '../stores/useAppStore';
import qs from 'qs';

/**
 * Fetches search results from the ArXiv API via the backend.
 * @param query The user's keyword search string.
 * @param filters The filter object containing date range, categories, etc.
 * @returns A promise that resolves to an array of `LocalPaper` objects.
 */
const fetchPapers = async (query: string, filters: SearchFilters): Promise<LocalPaper[]> => {
    const params = {
        query: query || undefined,
        limit: filters.limit,
        start_date: filters.startDate,
        end_date: filters.endDate,
        categories: filters.categories,
    };

    const { data } = await apiClient.get<LocalPaper[]>('/papers/search', {
        params,
        paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
    return data;
};

/**
 * Fetches all papers saved in the local library from the backend.
 * @returns A promise that resolves to an array of `Paper` objects.
 */
const fetchLibrary = async (): Promise<LocalPaper[]> => {
    const { data } = await apiClient.get<LocalPaper[]>('/papers/library');
    return data;
}

/**
 * Hook for searching papers on ArXiv.
 * 
 * It automatically triggers a refetch when the search query or filters change.
 * The query is only enabled when the backend is ready and the view is set to 'search'.
 * 
 * @returns The standard `useQuery` result object for ArXiv search.
 */
export const useSearchPapers = () => {
    // Lấy state từ Store
    const { searchQuery, filters, currentView, isBackendReady } = useAppStore();

    return useQuery({
        queryKey: ['papers', searchQuery, filters],
        queryFn: () => fetchPapers(searchQuery, filters),
        // Only run this query if the backend is connected and we are in the 'search' view
        enabled: isBackendReady && currentView === 'search',
        // Keep showing old data while new data is being fetched for a smoother UX
        placeholderData: (previousData) => previousData,
        // Don't retry if the backend isn't ready, to avoid startup errors
        retry: isBackendReady ? 1 : 0 ,
    });
};

/**
 * Hook for fetching the user's local library of saved papers.
 * 
 * @returns The standard `useQuery` result object for the local library.
 */
export const useLibrary = () => {
    const { isBackendReady } = useAppStore();
    return useQuery({
        queryKey: ['papers', 'library'],
        queryFn: fetchLibrary,
        enabled: isBackendReady
    });
};

/**
 * Hook for saving a paper to the local library.
 * 
 * After a successful save, it invalidates all queries with the key 'papers'
 * to force a refetch of both the search results and the library, ensuring the
 * "Saved" status is updated everywhere.
 * 
 * @returns The `useMutation` object for the save operation.
 */
export const useSavePaper = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (paper: LocalPaper) => {
            const { data } = await apiClient.post<LocalPaper>('/papers/save', paper);
            return data;
        },
        onSuccess: () => {
            // Invalidate all paper-related queries to update UI state
            queryClient.invalidateQueries({ queryKey: ['papers'] });
        }
    });
};

/**
 * Hook for performing a hard delete of a paper from the local library.
 * 
 * After a successful deletion, it cleans up all related caches in React Query,
 * including search results, analysis status, ToC, and chat history, to ensure
 * the UI correctly reflects the deleted state.
 * 
 * @returns The `useMutation` object for the delete operation.
 */
export const useDeletePaper = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (paperId: string) => {
            await apiClient.delete(`/papers/${paperId}`);
        },
        onSuccess: (_, paperId) => {
            queryClient.invalidateQueries({ queryKey: ['papers'] });
            queryClient.invalidateQueries({ queryKey: ['analysis_status', paperId] });
            queryClient.removeQueries({ queryKey: ['paper_toc', paperId] });
            queryClient.removeQueries({ queryKey: ['chat_history', paperId] });
        }
    });
};