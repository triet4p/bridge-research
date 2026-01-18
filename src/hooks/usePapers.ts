import { useQuery } from '@tanstack/react-query';
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

// Custom Hook dùng trong Component
export const useSearchPapers = () => {
    // Lấy state từ Store
    const { searchQuery, filters } = useAppStore();

    return useQuery({
        // Key định danh cho request này (phụ thuộc vào query và filters)
        queryKey: ['papers', searchQuery, filters],
        
        // Hàm thực thi
        queryFn: () => fetchPapers(searchQuery, filters),
        
        // Chỉ chạy khi có query
        enabled: true,
        
        // Giữ data cũ trong khi đang fetch mới (UX mượt hơn)
        placeholderData: (previousData) => previousData,
    });
};