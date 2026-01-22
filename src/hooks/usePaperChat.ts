// src/hooks/usePaperChat.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { ChatRequest, ChatResponse, ChatMessage } from '../types/api';

export const usePaperChat = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (req: ChatRequest) => {
            const { data } = await apiClient.post<ChatResponse>('/papers/chat', req, {
                timeout: 120000 
            });
            return data;
        },
        onSuccess: (_, variables) => {
            // Khi chat xong, ta có thể chọn 1 trong 2 cách:
            // C1: Invalidate query để load lại toàn bộ history từ DB (Chậm hơn chút nhưng chắc chắn)
            // C2: Manual update cache (Nhanh hơn) -> Chọn cách này ở Component cho mượt
            
            // Tuy nhiên, tốt nhất là invalidate để đồng bộ nếu có metadata mới
            queryClient.invalidateQueries({ queryKey: ['chat_history', variables.paper_id] });
        }
    });
};

export const useChatHistory = (paperId: string, enabled: boolean) => {
    return useQuery({
        queryKey: ['chat_history', paperId],
        queryFn: async () => {
            const { data } = await apiClient.get<ChatMessage[]>(`/papers/${paperId}/history`);
            return data;
        },
        enabled: enabled && !!paperId,
        staleTime: 0, // Luôn lấy mới khi mở lại
    });
};