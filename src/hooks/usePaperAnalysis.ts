/**
 * @fileoverview Custom hooks for paper analysis features.
 * 
 * This module provides hooks for:
 * - Generating AI-powered summaries.
 * - Checking if a paper has been analyzed.
 * - Triggering the analysis pipeline (download, parse, index).
 * - Deleting analysis data.
 * - Fetching the cached Table of Contents (ToC).
 * - A composite hook (`useAnalyzeWithSave`) that orchestrates saving and analyzing.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { 
    SummaryRequest, 
    SummaryResponse, 
    ParsedDocument, 
    AnalysisStatus, 
    LocalPaper,
    TocNode
} from '../types/api';
import { useSavePaper } from './usePapers';

/**
 * Hook for generating a quick summary of a paper's abstract.
 * 
 * @returns The `useMutation` object for the summary generation operation.
 */
export const useGenerateSummary = () => {
    return useMutation({
        mutationFn: async (req: SummaryRequest) => {
            const { data } = await apiClient.post<SummaryResponse>('/papers/summary', req, {
                timeout: 180000 
            });
            return data;
        }
    });
};

/**
 * Hook to check if a paper has already been analyzed.
 * 
 * @param paperId The ID of the paper to check.
 * @param enabled A flag to conditionally enable the query.
 * @returns The `useQuery` result object for the analysis status.
 */
export const useAnalysisStatus = (paperId: string, enabled: boolean = false) => {
    return useQuery({
        queryKey: ['analysis_status', paperId],
        queryFn: async () => {
            const { data } = await apiClient.get<AnalysisStatus>(`/papers/${paperId}/analysis-status`);
            return data;
        },
        enabled: enabled && !!paperId,
        staleTime: 0, // Always check for the latest status
    });
};

/**
 * Hook to trigger the backend's deep analysis pipeline.
 * This is a "fire-and-forget" mutation that downloads, parses, and indexes the paper.
 * 
 * @returns The `useMutation` object for the analysis operation.
 */
export const useAnalyzePaper = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (payload: { paperId: string; pdfUrl: string }) => {
            const { data } = await apiClient.post<ParsedDocument>(
                `/papers/${payload.paperId}/analyze`, 
                null, 
                { 
                    params: { pdf_url: payload.pdfUrl }, 
                    timeout: 300000 // 5 minutes (Tải PDF + Parse tốn thời gian)
                }
            );
            return data;
        },
        onSuccess: (_, variables) => {
            // After analysis is complete, invalidate the status to update the UI
            // (e.g., switch from "Analyze" button to "Chat" interface).
            queryClient.invalidateQueries({ queryKey: ['analysis_status', variables.paperId] });
        }
    });
};

/**
 * Hook to delete a paper's analysis data (ToC, Chat History).
 * This does NOT delete the paper from the library.
 * 
 * @returns The `useMutation` object for the deletion operation.
 */
export const useDeleteAnalysis = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (paperId: string) => {
            await apiClient.delete(`/papers/${paperId}/analysis`);
        },
        onSuccess: (_, paperId) => {
            queryClient.invalidateQueries({ queryKey: ['analysis_status', paperId] });
            queryClient.removeQueries({ queryKey: ['paper_toc', paperId] });
            queryClient.removeQueries({ queryKey: ['chat_history', paperId] });
            
        }
    });
};

/**
 * Hook to fetch the pre-parsed Table of Contents (ToC) for an analyzed paper.
 * 
 * This is a read-only query that will return 404 if the analysis hasn't been done,
 * which is handled by React Query's error state.
 * 
 * @param paperId The ID of the paper.
 * @param enabled A flag to conditionally enable the query.
 * @returns The `useQuery` result object for the ToC data.
 */
export const useToc = (paperId: string, enabled: boolean) => {
    return useQuery({
        queryKey: ['paper_toc', paperId],
        queryFn: async () => {
            // --- FIX: Gọi API GET an toàn ---
            const { data } = await apiClient.get<TocNode[]>(`/papers/${paperId}/toc`);
            return data;
        },
        enabled: enabled && !!paperId,
        staleTime: Infinity, // ToC data is static unless analysis is deleted.
        retry: false, // Don't retry on 404 (Not Found) errors.
    });
};

/**
 * A composite hook that orchestrates the "Analyze" user action.
 * 
 * It ensures that a paper is saved to the local library *before* triggering the
 * more intensive analysis process. It combines the state of both mutations
 * to provide a unified `isPending` status to the UI.
 * 
 * @returns An object with a `trigger` function and combined mutation states.
 */
export const useAnalyzeWithSave = () => {
    const saveMutation = useSavePaper();
    const analyzeMutation = useAnalyzePaper();

    /**
     * The function to be called by the UI component.
     * @param paper The full `LocalPaper` object to be analyzed.
     */
    const trigger = async (paper: LocalPaper) => {
        // Step 1: If the paper is not already saved, save its metadata first.
        // This ensures the backend has a record to associate the analysis with.
        if (!paper.is_saved) {
            try {
                await saveMutation.mutateAsync(paper);
            } catch (error) {
                console.error("Auto-save failed during analysis:", error);
            }
        }

        // Step 2: Trigger the main analysis process.
        analyzeMutation.mutate({ 
            paperId: paper.paper_id, 
            pdfUrl: paper.pdf_link 
        });
    };

    return {
        /** The function to initiate the save-then-analyze workflow. */
        trigger,
        /** True if either the save or analyze mutation is in progress. */
        isPending: saveMutation.isPending || analyzeMutation.isPending,
        /** True only when the final analysis step is successful. */
        isSuccess: analyzeMutation.isSuccess,
        /** The error object from either mutation. */
        error: analyzeMutation.error || saveMutation.error,
        /** A function to reset the state of both mutations. */
        reset: () => {
            saveMutation.reset();
            analyzeMutation.reset();
        }
    };
};
