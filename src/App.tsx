import { useEffect, useRef } from 'react';
import { useAppStore, hasActiveOperations } from './stores/useAppStore';
import { useSearchPapers, useLibrary } from './hooks/usePapers';
import { Header } from './components/layout/Header';
import { PaperCard } from './components/paper/PaperCard';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiClient } from './lib/axios';
import { useLibraryFilter } from './hooks/useLibraryFilter';
import { LMSettingsModal } from './components/settings/LMSettingsModal';
import { ChatModal } from './components/chat/ChatModal';
import { TrendDashboard } from './components/trends/TrendDashboard'; 
import { StartupOverlay } from './components/layout/StartupOverlay';
import { invoke } from '@tauri-apps/api/core'; // 👈 Import invoke

function App() {
  const { 
    isDarkMode, searchQuery, currentView, t, 
    isBackendReady, setBackendReady, 
    minDisplayTimeReached, setMinDisplayTimeReached,
    setConnectionError 
  } = useAppStore();
  
  const searchResult = useSearchPapers();
  const libraryResult = useLibrary();
  const filteredLibrary = useLibraryFilter(libraryResult.data, searchQuery);
  const paperViewData = currentView === 'search' ? searchResult : { ...libraryResult, data: filteredLibrary };
  const { data: papers, isLoading, isError, error, refetch, isRefetching } = paperViewData;

  const retryCountRef = useRef(0);

  // ===== 1. Khởi tạo UI & Ra lệnh bật Backend =====
  useEffect(() => {
    // Đợi 5s cho thời gian hiển thị tối thiểu (UX)
    const displayTimer = setTimeout(() => setMinDisplayTimeReached(true), 5000);

    // Đợi 2s cho UI render xong mượt mà rồi mới bật Backend
    const sidecarTimer = setTimeout(async () => {
      try {
        console.log("[System] Requesting Rust to start Sidecar...");
        await invoke('start_sidecar');
      } catch (err) {
        console.error("Failed to trigger sidecar:", err);
      }
    }, 2000);

    return () => {
      clearTimeout(displayTimer);
      clearTimeout(sidecarTimer);
    };
  }, [setMinDisplayTimeReached]);

  // ===== 2. Handshake với Backend (Ping mỗi 1.5s cho đến khi sống) =====
  useEffect(() => {
    const checkConnection = async () => {
      if (hasActiveOperations()) return;
      try {
        await apiClient.get('/health', { timeout: 3000 });
        if (!isBackendReady) {
          setBackendReady(true);
          setConnectionError(null);
        }
      } catch (e) {
        if (!isBackendReady) {
          retryCountRef.current += 1;
          // Tăng ngưỡng đợi lên vì Sidecar khởi động sau 2 giây
          if (retryCountRef.current >= 50) { 
            setConnectionError("Sidecar connection timeout. Check port 14201.");
          }
        }
      }
    };
    const interval = setInterval(checkConnection, isBackendReady ? 8000 : 1500);
    return () => clearInterval(interval);
  }, [isBackendReady, setBackendReady, setConnectionError]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const canEnterApp = isBackendReady && minDisplayTimeReached;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      <StartupOverlay canEnter={canEnterApp} />

      {canEnterApp ? (
        <div className="animate-in fade-in duration-1000 flex flex-col min-h-screen">
          <Header onRefresh={refetch} isRefreshing={isRefetching} />
          <main className="max-w-6xl mx-auto px-4 py-8 flex-1">
            {currentView === 'trends' ? (
              <TrendDashboard />
            ) : (
              <div className="space-y-6">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                    <p>Searching ArXiv...</p>
                  </div>
                )}
                {isError && (
                  <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-3xl text-center">
                    <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
                    <p className="text-sm text-red-600 mb-4">{(error as any)?.message}</p>
                    <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">Retry</button>
                  </div>
                )}
                {!isLoading && !isError && papers && papers.length > 0 && (
                  <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between px-2 font-black uppercase text-[10px] tracking-widest text-slate-400">
                        <span>{t.results} ({papers.length})</span>
                        <span>Source: {currentView === 'search' ? 'ArXiv' : 'Local'}</span>
                    </div>
                    {papers.map((paper) => (
                      <PaperCard key={paper.paper_id} paper={paper} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-950" />
      )}

      <LMSettingsModal />
      <ChatModal />
    </div>
  );
}

export default App;