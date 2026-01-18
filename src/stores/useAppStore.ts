// src/stores/useAppStore.ts
import { create } from 'zustand';
import { SearchFilters } from '../types/api';
import { DEFAULT_PAGE_SIZE, DEFAULT_DATE_RANGE } from '../constants/defaults';
import { TRANSLATIONS } from '../constants/translations';

interface AppState {
    searchQuery: string;
    filters: SearchFilters;
    isDarkMode: boolean;
    language: 'en' | 'vi';

    t: typeof TRANSLATIONS['en'];
    
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<SearchFilters>) => void;
    toggleTheme: () => void;
    setLanguage: (lang: 'en' | 'vi') => void;
}

const DEFAULT_FILTERS: SearchFilters = {
    limit: DEFAULT_PAGE_SIZE,
    startDate: DEFAULT_DATE_RANGE.getStartDate(),
    endDate: DEFAULT_DATE_RANGE.getEndDate(),
    categories: ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL'] // Mặc định chọn 4 ngành hot
};

export const useAppStore = create<AppState>((set) => ({
    searchQuery: '', 
    language: 'en',
    t: TRANSLATIONS['en'],
    
    filters: DEFAULT_FILTERS,
    
    isDarkMode: true, // Default dark mode cho ngầu

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
}));