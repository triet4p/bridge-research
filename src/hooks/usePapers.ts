import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { Paper, SearchFilters } from '../types/api';
import { useAppStore } from '../stores/useAppStore';
import qs from 'qs';

// Hàm gọi API thuần (fetcher)
const fetchPapers = async (query: string, filters: SearchFilters): Promise<Paper[]> => {
    const params = {
        query: query || undefined,
        limit: filters.limit,
        start_date: filters.startDate,
        end_date: filters.endDate,
        categories: filters.categories,
    };

    const { data } = await apiClient.get<Paper[]>('/papers/search', {
        params,
        paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
    return data;
};

const fetchLibrary = async (): Promise<Paper[]> => {
    const { data } = await apiClient.get<Paper[]>('/papers/library');
    return data;
}

// Custom Hook dùng trong Component
export const useSearchPapers = () => {
    // Lấy state từ Store
    const { searchQuery, filters, currentView, isBackendReady } = useAppStore();

    return useQuery({
        // Key định danh cho request này (phụ thuộc vào query và filters)
        queryKey: ['papers', searchQuery, filters],
        
        // Hàm thực thi
        queryFn: () => fetchPapers(searchQuery, filters),
        
        // Chỉ chạy khi có query
        enabled: isBackendReady && currentView === 'search',
        
        // Giữ data cũ trong khi đang fetch mới (UX mượt hơn)
        placeholderData: (previousData) => previousData,

        retry: isBackendReady ? 1 : 0 ,
    });
};

export const useLibrary = () => {
    const { isBackendReady } = useAppStore();
    return useQuery({
        queryKey: ['papers', 'library'],
        queryFn: fetchLibrary,
        enabled: isBackendReady
    });
};

export const useSavePaper = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (paper: Paper) => {
            const { data } = await apiClient.post<Paper>('/papers/save', paper);
            return data;
        },
        onSuccess: () => {
            // Refresh lại cả Search và Library để cập nhật trạng thái is_downloaded
            queryClient.invalidateQueries({ queryKey: ['papers'] });
        }
    });
};

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