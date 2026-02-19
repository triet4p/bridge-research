/**
 * @fileoverview Main Zustand store for global application state.
 * 
 * This store manages UI state that is shared across many components, such as:
 * - Search and filter parameters.
 * - UI theme (dark/light mode).
 * - Internationalization (i18n).
 * - View navigation (e.g., switching between 'Search' and 'Library').
 * - Modal visibility.
 * - Connection status to the backend sidecar.
 */

import { create } from 'zustand';
import { SearchFilters } from '../types/api';
import { DEFAULT_PAGE_SIZE, DEFAULT_DATE_RANGE } from '../constants/defaults';
import { TRANSLATIONS } from '../constants/translations';
import type { ViewMode } from '../constants/ui';

/**
 * Defines the shape of the main application store's state and actions.
 */
interface AppState {
    /** The current keyword string entered in the main search bar. */
    searchQuery: string;
    /** An object containing filter parameters like date range, categories, and result limit. */
    filters: SearchFilters;
    /** Flag to control the application's theme. True for dark mode, false for light mode. */
    isDarkMode: boolean;
    /** The currently selected UI language ('en' or 'vi'). */
    language: 'en' | 'vi';
    /** 
     * The translation object for the current language. 
     * This is a convenience accessor to avoid getting the language and then the dictionary separately.
     */
    t: typeof TRANSLATIONS['en'];
    /** The active view or tab in the main interface (e.g., 'search' or 'library'). */
    currentView: ViewMode;
    /** Controls the visibility of the AI Settings modal. */
    isSettingsOpen: boolean;
    /** Flag indicating if the frontend has successfully connected to the backend sidecar. */
    isBackendReady: boolean;
    /** Track active operations to conditionally skip health checks */
    activeOperations: Set<string>;
    activeTrendTaskId: string | null;
    
    // --- Actions ---
    /** Updates the search query string. */
    setSearchQuery: (query: string) => void;
    /** Merges new filter values with the existing filter state. */
    setFilters: (filters: Partial<SearchFilters>) => void;
    /** Toggles the dark/light mode. */
    toggleTheme: () => void;
    /** Sets the application language and updates the translation dictionary `t`. */
    setLanguage: (lang: 'en' | 'vi') => void;
    /** Switches the main view between 'search' and 'library'. */
    setView: (view: ViewMode) => void; 
    /** Opens the AI Settings modal. */
    openSettings: () => void;
    /** Closes the AI Settings modal. */
    closeSettings: () => void;
    /** Sets the connection status of the backend. */
    setBackendReady: (status: boolean) => void;
    /** Register an active operation */
    addOperation: (id: string) => void;
    /** Remove a completed operation */
    removeOperation: (id: string) => void;

    setActiveTrendTaskId: (id: string | null) => void;
}

/**
 * Default filter settings applied on application startup.
 */
const DEFAULT_FILTERS: SearchFilters = {
    limit: DEFAULT_PAGE_SIZE,
    startDate: DEFAULT_DATE_RANGE.getStartDate(),
    endDate: DEFAULT_DATE_RANGE.getEndDate(),
    categories: ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL'] 
};

/**
 * Creates the main Zustand store for global application state.
 */
export const useAppStore = create<AppState>((set) => ({
    searchQuery: '', 
    language: 'en',
    t: TRANSLATIONS['en'],
    filters: DEFAULT_FILTERS,
    isDarkMode: true,
    currentView: 'search',
    isSettingsOpen: false,
    isBackendReady: false,
    activeOperations: new Set(),
    activeTrendTaskId: null, 

    setSearchQuery: (query) => set({ searchQuery: query }),
    
    setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
    })),
    
    toggleTheme: () => set((state) => ({ 
        isDarkMode: !state.isDarkMode 
    })),

    setLanguage: (lang) => set({ 
        language: lang,
        t: TRANSLATIONS[lang] 
    }),

    setView: (view) => set({ currentView: view }),

    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),

    setBackendReady: (status) => set({ isBackendReady: status }),
    
    addOperation: (id) => set((state) => {
        const newOps = new Set(state.activeOperations);
        newOps.add(id);
        return { activeOperations: newOps };
    }),
    
    removeOperation: (id) => set((state) => {
        const newOps = new Set(state.activeOperations);
        newOps.delete(id);
        return { activeOperations: newOps };
    }),

    setActiveTrendTaskId: (id) => set({ activeTrendTaskId: id }),
}));

/**
 * Helper selector to check if any operations are currently active
 */
export const hasActiveOperations = (): boolean => {
    return useAppStore.getState().activeOperations.size > 0;
};