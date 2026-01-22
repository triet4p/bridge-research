// src/App.tsx
import { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { useSearchPapers, useLibrary } from './hooks/usePapers';
import { Header } from './components/layout/Header';
import { PaperCard } from './components/paper/PaperCard';
import { Loader2, AlertTriangle, FileText, BookOpen } from 'lucide-react';
import { apiClient } from './lib/axios';
import { useLibraryFilter } from './hooks/useLibraryFilter';
import { LMSettingsModal } from './components/settings/LMSettingsModal';
import { ChatModal } from './components/chat/ChatModal';

function App() {
  const { isDarkMode, searchQuery, currentView, t, isBackendReady, setBackendReady } = useAppStore();
  
  // 1. Gọi cả 2 hooks data
  const searchResult = useSearchPapers();
  const libraryResult = useLibrary();

  const filteredLibrary = useLibraryFilter(libraryResult.data, searchQuery);

  // 2. Xác định dữ liệu đang active dựa trên currentView
  // Kỹ thuật này giúp UI code bên dưới không cần quan tâm đang ở tab nào
  const { 
    data: papers, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    isRefetching,
  } = currentView === 'search' ? searchResult : { ...libraryResult, data: filteredLibrary };

  // --- Heartbeat Logic (Keep Sidecar Alive) ---
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await apiClient.get('/health');
        if (!isBackendReady) {
          setBackendReady(true);
        }
      } catch (e) {
        // Silent error
      }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [isBackendReady, setBackendReady]);

  // --- Theme Sync Logic ---
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
        
        {/* State: Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
            <p>
              {currentView === 'search' 
                ? `Searching ArXiv for "${searchQuery}"...` 
                : "Loading your library..."}
            </p>
          </div>
        )}

        {/* State: Error */}
        {isError && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-center animate-in fade-in">
            <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">
              {currentView === 'search' ? "Search Failed" : "Library Error"}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {(error as any)?.message || "Could not connect to Bridge AI Brain."}
            </p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
              Retry Connection
            </button>
          </div>
        )}

        {/* State: Empty (Chia trường hợp cho Search và Library) */}
        {!isLoading && !isError && papers?.length === 0 && (
          <div className="py-20 text-center opacity-60 animate-in fade-in slide-in-from-bottom-4">
            {currentView === 'search' ? (
                <>
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>{t.noResults}</p>
                </>
            ) : (
                <>
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Your library is empty.</p>
                    <p className="text-sm mt-2">Go to <b>Search</b> and save some papers!</p>
                </>
            )}
          </div>
        )}

        {/* State: Data List */}
        {!isLoading && !isError && papers && papers.length > 0 && (
          <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {t.results} <span className="text-sm font-normal text-gray-500">({papers.length})</span>
                </h2>
                <span className="text-xs text-gray-400 italic">
                    {t.source}: {currentView === 'search' ? 'ArXiv.org' : 'Local Database'}
                </span>
            </div>
            
            {papers.map((paper) => (
              <PaperCard 
                key={paper.paper_id} 
                paper={paper} 
              />
            ))}
          </div>
        )}

      </main>

      <LMSettingsModal />
      <ChatModal />
    </div>
  );
}

export default App;