/**
 * @fileoverview Custom hooks for the RAG (Retrieval-Augmented Generation) chat feature.
 * 
 * This module provides hooks for:
 * - Fetching the conversation history for a specific paper.
 * - Sending a new message to the chat engine and receiving an AI-generated response.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { ChatRequest, ChatResponse, ChatMessage } from '../types/api';

/**
 * Hook for sending a message to the RAG chat engine.
 * 
 * It uses a `useMutation` hook to handle the POST request. After a successful
 * response from the AI, it invalidates the `chat_history` query to trigger a
 * refetch, ensuring the conversation UI is updated with the latest messages
 * from the database.
 * 
 * @returns The `useMutation` object for the chat operation.
 */
export const usePaperChat = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (req: ChatRequest) => {
            // Send the user's message to the backend's RAG endpoint.
            // A long timeout is set to accommodate slow local LLM inference.
            const { data } = await apiClient.post<ChatResponse>('/papers/chat', req, {
                timeout: 120000 
            });
            return data;
        },
        onSuccess: (_, variables) => {
            // After the AI responds and the conversation is saved to the DB,
            // invalidate the chat history query. This tells React Query that the
            // 'chat_history' data is stale, prompting a refetch to get the
            // complete and updated conversation. This is a robust way to ensure
            // data consistency between the client and server.
            queryClient.invalidateQueries({ queryKey: ['chat_history', variables.paper_id] });
        }
    });
};

/**
 * Hook for fetching the chat history of a specific paper.
 * 
 * It uses a `useQuery` hook that is conditionally enabled. It will only
 * fetch data when the `enabled` flag is true, which is typically when the
 * chat modal is open and the paper has been successfully analyzed.
 *
 * @param {string} paperId - The ID of the paper whose history is to be fetched.
 * @param {boolean} enabled - A flag to conditionally enable or disable the query.
 * @returns The standard `useQuery` result object for the chat history.
 */
export const useChatHistory = (paperId: string, enabled: boolean) => {
    return useQuery({
        // The query key is an array that uniquely identifies this data.
        // It includes the paperId so that different papers have different caches.
        queryKey: ['chat_history', paperId],
        
        queryFn: async () => {
            const { data } = await apiClient.get<ChatMessage[]>(`/papers/${paperId}/history`);
            return data;
        },
        
        // The query will only run if 'enabled' is true and paperId is valid.
        enabled: enabled && !!paperId,
        
        // Always consider the data stale to ensure the latest history is fetched
        // every time the chat modal is opened.
        staleTime: 0,
    });
};