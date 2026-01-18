// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { Search, RefreshCw, Moon, Sun, Languages, Calendar as CalendarIcon, Filter, Check } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { ARXIV_CATEGORIES } from '../../constants/defaults';

interface HeaderProps {
    onRefresh: () => void;
    isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
    const { searchQuery, setSearchQuery, isDarkMode, toggleTheme, filters, setFilters, language, setLanguage, t } = useAppStore();
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [showCatFilter, setShowCatFilter] = useState(false); // State cho dropdown category

    const handleSearch = () => setSearchQuery(localQuery);
    const handleKeyDown = (e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch();

    const toggleCategory = (id: string) => {
        const current = filters.categories || [];
        const newCats = current.includes(id)
            ? current.filter(c => c !== id)
            : [...current, id];
        setFilters({ categories: newCats });
    };

    return (
        <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/80 dark:bg-slate-950/80 border-b border-gray-200 dark:border-slate-800">
            <div className="max-w-5xl mx-auto px-4 py-4">
                
                {/* Search Row */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                    <div className="flex items-center gap-2 select-none">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">B</div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Bridge Research</span>
                    </div>

                    <div className="flex-1 w-full max-w-2xl relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t.searchPlaceholder} // "Nhập từ khóa (vd: YOLO, LLM)..."
                            className="w-full bg-gray-100 dark:bg-slate-900 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl pl-12 pr-12 py-2.5 text-sm outline-none transition-all dark:text-white shadow-inner"
                        />
                        <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-800 rounded-xl hover:text-blue-600 transition-colors shadow-sm">
                            <Search size={14} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2">
                        
                        {/* 1. Category Filter */}
                        <div className="relative">
                            <button 
                                onClick={() => { setShowCatFilter(!showCatFilter); setShowDateFilter(false); }}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${showCatFilter || filters.categories.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-gray-50 dark:bg-slate-900 text-gray-500 border-transparent'}`}
                            >
                                <Filter size={14} />
                                <span>{filters.categories.length > 0 ? `${filters.categories.length} Topics` : 'Topics'}</span>
                            </button>

                            {showCatFilter && (
                                <div className="absolute top-full mt-2 left-0 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        {ARXIV_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-between group"
                                            >
                                                <div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 block">{cat.label}</span>
                                                    <span className="text-[10px] text-gray-400">{cat.id}</span>
                                                </div>
                                                {filters.categories.includes(cat.id) && <Check size={14} className="text-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Date Filter */}
                        <div className="relative">
                            <button 
                                onClick={() => { setShowDateFilter(!showDateFilter); setShowCatFilter(false); }}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${showDateFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 dark:bg-slate-900 text-gray-500 border-transparent'}`}
                            >
                                <CalendarIcon size={14} />
                                <span>Date</span>
                            </button>
                            {/* ... (Date Popover giữ nguyên như cũ) ... */}
                             {showDateFilter && (
                            <div className="absolute top-full mt-2 left-0 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.fromDate}</label>
                                        <input 
                                            type="date" 
                                            value={filters.startDate}
                                            onChange={(e) => setFilters({ startDate: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.toDate}</label>
                                        <input 
                                            type="date" 
                                            value={filters.endDate}
                                            onChange={(e) => setFilters({ endDate: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Actions (Language, Refresh, Theme) */}
                    <div className="flex items-center gap-2">
                        {/* ... (Giữ nguyên) ... */}
                        <button 
                            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-all text-xs font-bold"
                        >
                            <Languages size={16} />
                            <span>{language.toUpperCase()}</span>
                        </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-1"></div>

                        <button 
                            onClick={onRefresh}
                            className={`p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all ${isRefreshing ? 'animate-spin text-blue-500' : 'text-gray-500'}`}
                        >
                            <RefreshCw size={18} />
                        </button>

                        <button 
                            onClick={toggleTheme}
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-all"
                        >
                            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};