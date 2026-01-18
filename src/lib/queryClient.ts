import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // Data coi là mới trong 5 phút
            gcTime: 1000 * 60 * 30,   // Giữ cache trong 30 phút
            retry: 1,                 // Thử lại 1 lần nếu lỗi
            refetchOnWindowFocus: false, // Không tự fetch lại khi switch tab (đỡ lag)
        },
    },
});