import React, { useState } from 'react';
import { Search, RefreshCw, Moon, Sun, Languages, Calendar as CalendarIcon, Filter, Check, Hash, BookOpen, Search as SearchIcon, Settings, Zap } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { ARXIV_CATEGORIES } from '../../constants/defaults';
import logoImg from '../../assets/logo.png';

/**
 * Props interface for the Header component.
 * 
 * @interface HeaderProps
 * @property {() => void} onRefresh - Callback function to trigger data refresh
 * @property {boolean} isRefreshing - Whether the refresh operation is currently in progress
 */
interface HeaderProps {
    onRefresh: () => void;
    isRefreshing: boolean;
}

/**
 * Main application header component with search, filters, and settings controls.
 * 
 * This component provides:
 * - View switcher (Search vs Library)
 * - Search functionality with keyboard support
 * - Category filter with multi-select dropdown
 * - Date range filter
 * - Result limit configuration
 * - Language switcher (EN/VI)
 * - Theme toggle (Light/Dark mode)
 * - Refresh button with loading state
 * - Settings access button
 * 
 * The header is sticky and maintains its state through local component state,
 * with some state shared through the global app store.
 * 
 * @component
 * @param {HeaderProps} props - Component props
 * @returns {React.ReactElement} The rendered header component
 */
export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
    // ===== Global Store =====
    const { openSettings, currentView, setView, searchQuery, setSearchQuery, isDarkMode, toggleTheme, filters, setFilters, language, setLanguage, t } = useAppStore();
    
    // ===== Local Component State =====
    /** Temporary search input value (synced to store on search trigger) */
    const [localQuery, setLocalQuery] = useState(searchQuery);
    /** Whether the date filter dropdown is open */
    const [showDateFilter, setShowDateFilter] = useState(false);
    /** Whether the category filter dropdown is open */
    const [showCatFilter, setShowCatFilter] = useState(false);

    /**
     * Handler: Submit the search query to the global store.
     * Updates the global search query and triggers search results update.
     */
    const handleSearch = () => setSearchQuery(localQuery);
    
    /**
     * Handler: Detect Enter key press in search input and trigger search.
     * Provides keyboard shortcut to submit search without clicking button.
     * 
     * @param {React.KeyboardEvent} e - Keyboard event from input element
     */
    const handleKeyDown = (e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch();

    /**
     * Handler: Toggle category selection in the filter.
     * Adds or removes a category ID from the filter array.
     * Uses immutable array operations to maintain React state best practices.
     * 
     * @param {string} id - The category ID to toggle
     */
    const toggleCategory = (id: string) => {
        const current = filters.categories || [];
        const newCats = current.includes(id)
            ? current.filter(c => c !== id)
            : [...current, id];
        setFilters({ categories: newCats });
    };

    /**
     * Handler: Update the maximum results limit with validation.
     * Ensures the value stays within the valid range (1-100).
     * Defaults to 10 if input is cleared or non-numeric.
     * Frontend validation prevents invalid values from being stored.
     * 
     * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
     */
    const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value);
        // Default to 10 if value is cleared or non-numeric
        if (isNaN(val)) val = 10;
        
        // Validate value is within acceptable range
        if (val < 1) val = 1;
        if (val > 100) val = 100;
        
        setFilters({ limit: val });
    };

    return (
        <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/80 dark:bg-slate-950/80 border-b border-gray-200 dark:border-slate-800">
            <div className="max-w-5xl mx-auto px-4 py-4">
                {/* ===== VIEW SWITCHER TABS ===== */}
                <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 dark:bg-slate-900 p-1 rounded-xl flex gap-1">
                        {/* Search view tab - shows search interface */}
                        <button 
                            onClick={() => setView('search')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${currentView === 'search' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <SearchIcon size={14} /> Search
                        </button>
                        
                        {/* Library view tab - shows saved papers */}
                        <button 
                            onClick={() => setView('library')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${currentView === 'library' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <BookOpen size={14} /> Library
                        </button>
                        <button 
                            onClick={() => setView('trends')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${currentView === 'trends' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <Zap size={14} /> Trends
                        </button>
                    </div>
                </div>

                {/* ===== SEARCH BAR SECTION ===== */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                    {/* App branding - Bridge Research logo and name */}
                    <div className="flex items-center gap-2 select-none">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                            <img 
                                src={logoImg} 
                                alt="Logo" 
                                className="w-5 h-5 object-contain" 
                            />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Bridge Research</span>
                    </div>

                    {/* Search input with keyboard support */}
                    <div className="flex-1 w-full max-w-2xl relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t.searchPlaceholder}
                            className="w-full bg-gray-100 dark:bg-slate-900 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl pl-12 pr-12 py-2.5 text-sm outline-none transition-all dark:text-white shadow-inner"
                        />
                        {/* Search submit button */}
                        <button 
                            onClick={handleSearch} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-800 rounded-xl hover:text-blue-600 transition-colors shadow-sm"
                            title="Search"
                        >
                            <Search size={14} />
                        </button>
                    </div>
                </div>

                {/* ===== FILTERS & ACTIONS ROW ===== */}
                <div className="flex flex-wrap gap-2 justify-between items-center">
                    {/* Filter controls section */}
                    <div className="flex gap-2">
                        
                        {/* Category Filter Dropdown */}
                        <div className="relative">
                            {/* Category filter toggle button - shows count of selected categories */}
                            <button 
                                onClick={() => { setShowCatFilter(!showCatFilter); setShowDateFilter(false); }}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${showCatFilter || filters.categories.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-gray-50 dark:bg-slate-900 text-gray-500 border-transparent'}`}
                            >
                                <Filter size={14} />
                                <span>{filters.categories.length > 0 ? `${filters.categories.length} Topics` : 'Topics'}</span>
                            </button>

                            {/* Category dropdown menu with scrollable list */}
                            {showCatFilter && (
                                <div className="absolute top-full mt-2 left-0 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        {/* Render all available ArXiv categories */}
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
                                                {/* Checkmark indicator for selected categories */}
                                                {filters.categories.includes(cat.id) && <Check size={14} className="text-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date Range Filter */}
                        <div className="relative">
                            {/* Date filter toggle button */}
                            <button 
                                onClick={() => { setShowDateFilter(!showDateFilter); setShowCatFilter(false); }}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${showDateFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 dark:bg-slate-900 text-gray-500 border-transparent'}`}
                            >
                                <CalendarIcon size={14} />
                                <span>Date</span>
                            </button>
                            
                            {/* Date picker popover with start and end date inputs */}
                            {showDateFilter && (
                                <div className="absolute top-full mt-2 left-0 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-3">
                                        {/* Start date input */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.fromDate}</label>
                                            <input 
                                                type="date" 
                                                value={filters.startDate}
                                                onChange={(e) => setFilters({ startDate: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-white"
                                            />
                                        </div>
                                        {/* End date input */}
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

                        {/* Maximum Results Limit Input */}
                        <div className='flex items-center bg-gray-50 dark:bg-slate-900 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 rounded-xl px-3 py-2 transition-all'>
                            <Hash size={14} className="text-gray-400 mr-2" />
                            <input 
                                type="number" 
                                min="1" 
                                max="100"
                                value={filters.limit}
                                onChange={handleLimitChange}
                                className="w-10 bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none text-center"
                                title="Max Results (1-100)"
                            />
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Language switcher button - toggles between English and Vietnamese */}
                        <button 
                            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-all text-xs font-bold"
                            title="Toggle Language"
                        >
                            <Languages size={16} />
                            <span>{language.toUpperCase()}</span>
                        </button>

                        {/* Visual separator */}
                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-1"></div>

                        {/* Refresh button - fetches latest papers with loading animation */}
                        <button 
                            onClick={onRefresh}
                            className={`p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all ${isRefreshing ? 'animate-spin text-blue-500' : 'text-gray-500'}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} />
                        </button>

                        {/* Dark mode toggle button */}
                        <button 
                            onClick={toggleTheme}
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-all"
                            title="Toggle Dark Mode"
                        >
                            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        {/* Settings button - opens AI provider configuration modal */}
                        <button 
                            onClick={openSettings}
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-all"
                            title="AI Settings"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};