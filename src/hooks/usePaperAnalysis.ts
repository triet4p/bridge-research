// src/hooks/usePaperAnalysis.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { 
    SummaryRequest, 
    SummaryResponse, 
    ParsedDocument, 
    AnalysisStatus 
} from '../types/api';

// 1. Tóm tắt (Summary)
export const useGenerateSummary = () => {
    return useMutation({
        mutationFn: async (req: SummaryRequest) => {
            // API mới: /papers/summary (thay vì /ai/summarize)
            const { data } = await apiClient.post<SummaryResponse>('/papers/summary', req, {
                timeout: 180000 // 3 phút cho Local LLM
            });
            return data;
        }
    });
};

// 2. Kiểm tra trạng thái phân tích (Check Status)
export const useAnalysisStatus = (paperId: string, enabled: boolean = false) => {
    return useQuery({
        queryKey: ['analysis_status', paperId],
        queryFn: async () => {
            const { data } = await apiClient.get<AnalysisStatus>(`/papers/${paperId}/analysis-status`);
            return data;
        },
        enabled: enabled && !!paperId,
        staleTime: 0, // Luôn check mới nhất
    });
};

// 3. Thực hiện phân tích (Analyze - Download & Parse)
export const useAnalyzePaper = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (payload: { paperId: string; pdfUrl: string }) => {
            // API mới: /papers/{id}/analyze
            const { data } = await apiClient.post<ParsedDocument>(
                `/papers/${payload.paperId}/analyze`, 
                null, // Body rỗng
                { 
                    params: { pdf_url: payload.pdfUrl }, // Gửi URL qua query param
                    timeout: 300000 // 5 phút (Tải PDF + Parse tốn thời gian)
                }
            );
            return data;
        },
        onSuccess: (_, variables) => {
            // Invalidate status để UI cập nhật nút "Chat"
            queryClient.invalidateQueries({ queryKey: ['analysis_status', variables.paperId] });
        }
    });
};

// 4. Xóa phân tích (Delete Analysis)
export const useDeleteAnalysis = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (paperId: string) => {
            await apiClient.delete(`/papers/${paperId}/analysis`);
        },
        onSuccess: (_, paperId) => {
            queryClient.invalidateQueries({ queryKey: ['analysis_status', paperId] });
        }
    });
};

export const useReloadToc = () => {
    return useMutation({
        mutationFn: async (payload: { paperId: string; pdfUrl: string }) => {
            const { data } = await apiClient.post<ParsedDocument>(
                `/papers/${payload.paperId}/analyze`, 
                null, 
                { params: { pdf_url: payload.pdfUrl } }
            );
            return data.toc;
        }
    });
};