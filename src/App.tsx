// src/App.tsx
import { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { useSearchPapers } from './hooks/usePapers';
import { Header } from './components/layout/Header';
import { PaperCard } from './components/paper/PaperCard';
import { Loader2, AlertTriangle, FileText } from 'lucide-react';
import { apiClient } from './lib/axios';

function App() {
  const { isDarkMode, searchQuery } = useAppStore();
  
  // Hook tự động fetch khi searchQuery thay đổi
  const { data: papers, isLoading, isError, error, refetch, isRefetching } = useSearchPapers();

  useEffect(() => {
    // Hàm ping
    const sendHeartbeat = async () => {
      try {
        await apiClient.get('/health');
      } catch (e) {
        // Silent error (kệ nó nếu lỗi, vì có thể lúc tắt app rồi)
      }
    };

    // Gọi ngay lập tức lúc mount
    sendHeartbeat();

    // Gọi định kỳ mỗi 10 giây (nhỏ hơn timeout 30s của Python là an toàn)
    const interval = setInterval(sendHeartbeat, 10000);

    return () => clearInterval(interval);
  }, []);

  // Sync theme lúc khởi tạo
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      <Header onRefresh={refetch} isRefreshing={isRefetching} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
            <p>Searching ArXiv for "{searchQuery}"...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Search Failed</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {(error as any)?.message || "Could not connect to Bridge AI Brain."}
            </p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && papers?.length === 0 && (
          <div className="py-20 text-center opacity-60">
            <FileText size={48} className="mx-auto mb-4" />
            <p>No papers found. Try adjusting your keywords.</p>
          </div>
        )}

        {/* Data List */}
        {!isLoading && !isError && papers && papers.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    Results <span className="text-sm font-normal text-gray-500">({papers.length})</span>
                </h2>
                <span className="text-xs text-gray-400 italic">
                    Source: ArXiv.org
                </span>
            </div>
            
            {papers.map((paper) => (
              <PaperCard 
                key={paper.paper_id} 
                paper={paper} 
                onChat={(p) => console.log("Chat with:", p.paper_id)} 
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;