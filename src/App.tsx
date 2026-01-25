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

/**
 * Root App component for the Bridge Research application.
 * 
 * This component manages the overall application state and layout:
 * - Displays the header with search and filter controls
 * - Manages dual data sources: ArXiv search and local library
 * - Switches between Search and Library views
 * - Handles backend health checks via heartbeat
 * - Syncs dark mode theme to document
 * - Renders appropriate UI states (loading, error, empty, data)
 * - Integrates modals (Settings and Chat)
 * 
 * Data Flow:
 * 1. Always fetches both search and library data in background
 * 2. Determines active data based on currentView
 * 3. Applies library filtering when in library view
 * 4. Displays appropriate UI based on data loading/error states
 * 
 * @component
 * @returns {React.ReactElement} The main application interface
 */
function App() {
  // ===== Global Store State =====
  const { isDarkMode, searchQuery, currentView, t, isBackendReady, setBackendReady } = useAppStore();
  
  // ===== Data Fetching Hooks =====
  /** Fetch papers from ArXiv based on search query */
  const searchResult = useSearchPapers();
  /** Fetch papers from local library database */
  const libraryResult = useLibrary();

  // ===== Data Processing =====
  /** Apply search query filter to library papers */
  const filteredLibrary = useLibraryFilter(libraryResult.data, searchQuery);

  /**
   * Smart data selection based on current view.
   * This abstraction allows UI code below to work with a single data source
   * without needing to know which view is active.
   */
  const { 
    data: papers, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    isRefetching,
  } = currentView === 'search' ? searchResult : { ...libraryResult, data: filteredLibrary };

  // ===== Effect: Backend Health Check (Keep Sidecar Alive) =====
  /**
   * Send periodic heartbeat requests to backend.
   * Ensures the Python sidecar process remains active and responsive.
   * 
   * - Sends health check every 10 seconds
   * - Updates backend ready status on successful connection
   * - Silently handles errors without disrupting UI
   * - Cleans up interval on component unmount
   */
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await apiClient.get('/health');
        if (!isBackendReady) {
          setBackendReady(true);
        }
      } catch (e) {
        // Silent error - allows graceful degradation if backend is temporarily unavailable
      }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [isBackendReady, setBackendReady]);

  // ===== Effect: Sync Dark Mode to Document =====
  /**
   * Synchronize dark mode preference with HTML document class.
   * Tailwind CSS uses the 'dark' class on the root element to apply dark mode styles.
   * This effect ensures the class is added/removed whenever isDarkMode changes.
   */
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Application Header with Search and Filters */}
      <Header onRefresh={refetch} isRefreshing={isRefetching} />

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* State 1: Loading Papers */}
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

        {/* State 2: Error Occurred */}
        {isError && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-center animate-in fade-in">
            <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">
              {currentView === 'search' ? "Search Failed" : "Library Error"}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {(error as any)?.message || "Could not connect to Bridge AI Brain."}
            </p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* State 3: Empty Results (context-aware messaging) */}
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

        {/* State 4: Display Paper List */}
        {!isLoading && !isError && papers && papers.length > 0 && (
          <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Results header with count and source info */}
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {t.results} <span className="text-sm font-normal text-gray-500">({papers.length})</span>
                </h2>
                <span className="text-xs text-gray-400 italic">
                    {t.source}: {currentView === 'search' ? 'ArXiv.org' : 'Local Database'}
                </span>
            </div>
            
            {/* Render paper cards in a grid */}
            {papers.map((paper) => (
              <PaperCard 
                key={paper.paper_id} 
                paper={paper} 
              />
            ))}
          </div>
        )}

      </main>

      {/* Modals */}
      <LMSettingsModal />
      <ChatModal />
    </div>
  );
}

export default App;