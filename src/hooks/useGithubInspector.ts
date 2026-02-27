// src/hooks/useGithubInspector.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { GithubAnalyzeRequest, GithubRepoResponse } from '../types/api';
import { useAppStore } from '../stores/useAppStore';

/**
 * Mutation Hook: Yêu cầu AI phân tích một Github Repo.
 * Sử dụng chung cho cả Luồng Độc Lập (không truyền paper_id) và Luồng Ngữ Cảnh (có truyền paper_id).
 */
export const useAnalyzeRepo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (req: GithubAnalyzeRequest) => {
            // Set timeout dài (3 phút) vì AI cần thời gian quét code và suy luận
            const { data } = await apiClient.post<GithubRepoResponse>('/github/analyze', req, {
                timeout: 180000 
            });
            return data;
        },
        onSuccess: (_, variables) => {
            // Sau khi phân tích thành công, cập nhật lại dữ liệu cho view Code Hub
            queryClient.invalidateQueries({ queryKey: ['github', 'all'] });
            
            // Nếu đây là phân tích từ trong một bài báo, cập nhật lại danh sách của bài báo đó
            if (variables.paper_id) {
                queryClient.invalidateQueries({ queryKey: ['github', 'paper', variables.paper_id] });
            }
        }
    });
};

/**
 * Query Hook: Lấy toàn bộ danh sách các Repo đã lưu trong Database.
 * Phục vụ cho View "Code Hub".
 */
export const useAllRepos = () => {
    const { isBackendReady } = useAppStore();
    
    return useQuery({
        queryKey: ['github', 'all'],
        queryFn: async () => {
            const { data } = await apiClient.get<GithubRepoResponse[]>('/github/repos');
            return data;
        },
        enabled: isBackendReady
    });
};

/**
 * Query Hook: Lấy danh sách các Repo được liên kết với một bài báo cụ thể.
 * Phục vụ cho Tab "Implementation" bên trong ChatModal.
 */
export const usePaperRepos = (paperId: string | null | undefined) => {
    const { isBackendReady } = useAppStore();
    
    return useQuery({
        queryKey: ['github', 'paper', paperId],
        queryFn: async () => {
            const { data } = await apiClient.get<GithubRepoResponse[]>(`/github/paper/${paperId}`);
            return data;
        },
        // Chỉ chạy query nếu đã có paperId
        enabled: isBackendReady && !!paperId
    });
};

/**
 * Mutation Hook: Xóa Hard Delete một Repo khỏi Database.
 * Sẽ trigger xóa cả các liên kết trong bảng trung gian (Backend lo việc này).
 */
export const useDeleteRepo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (repoId: string) => {
            await apiClient.delete(`/github/repo/${repoId}`);
        },
        onSuccess: () => {
            // Reset toàn bộ cache liên quan đến github để đảm bảo UI không hiển thị Repo đã xóa
            queryClient.invalidateQueries({ queryKey: ['github'] });
        }
    });
};

/**
 * Mutation Hook: Hủy liên kết giữa một bài báo và một repo.
 * Không làm mất dữ liệu phân tích của repo đó trong Database.
 */
export const useUnlinkRepo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ paperId, repoId }: { paperId: string, repoId: string }) => {
            await apiClient.delete(`/github/paper/${paperId}/repo/${repoId}`);
        },
        onSuccess: (_, variables) => {
            // Chỉ cập nhật lại danh sách Repo của bài báo này
            queryClient.invalidateQueries({ queryKey: ['github', 'paper', variables.paperId] });
        }
    });
};