import React, { useState } from 'react';
import { LocalPaper } from '../../types/api';
import { Calendar, FileText, ChevronDown, ChevronUp, ExternalLink, Save, MessageSquareText, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { openExternal } from '../../utils/openLink';
import { formatAbstract } from '../../utils/textFormatter';
import { useAppStore } from '../../stores/useAppStore';
import { getCategoryLabel, getCategoryDesc } from '../../constants/defaults';
import { useSavePaper, useDeletePaper } from '../../hooks/usePapers';
import { useGenerateSummary } from '../../hooks/usePaperAnalysis';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../../stores/useChatStore';

/**
 * Props interface for the PaperCard component.
 * 
 * @interface PaperCardProps
 * @property {LocalPaper} paper - The paper data object containing metadata, abstract, and saved status
 */
interface PaperCardProps {
    paper: LocalPaper;
}

/**
 * PaperCard component for displaying research paper information in card format.
 * 
 * This component provides a comprehensive paper preview card with:
 * - Paper metadata (title, authors, publication date, category)
 * - Save/unsave functionality
 * - Expandable abstract and AI-generated summary
 * - Action buttons for opening PDF, ArXiv page, and chat analysis
 * - AI summarization with error handling and retry capability
 * 
 * The card intelligently manages state to prevent redundant API calls and
 * maintains the UI visibility once a summary generation is requested.
 * 
 * @component
 * @param {PaperCardProps} props - Component props
 * @returns {React.ReactElement} The rendered paper card component
 */
export const PaperCard: React.FC<PaperCardProps> = ({ paper }) => {
    // ===== UI State Management =====
    /** Whether the card is expanded to show full abstract and AI summary */
    const [isExpanded, setIsExpanded] = useState(false);
    
    // ===== Store & Context =====
    const { t, language } = useAppStore();
    const { openChat } = useChatStore();
    
    // ===== API Mutation Hooks - Data Operations =====
    /** Mutation hook for saving a paper to the library */
    const saveMutation = useSavePaper();
    /** Mutation hook for deleting/removing a paper from the library */
    const deleteMutation = useDeletePaper();
    
    // ===== AI Generation State =====
    /** AI-generated summary text (null until generated, set to string on success) */
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    /** Flag to track whether user has requested AI summary (persists through errors to show UI) */
    const [hasRequested, setHasRequested] = useState(false);
    /** Mutation hook for generating AI summary from abstract text */
    const summaryMutation = useGenerateSummary();

    // ===== Derived State =====
    /** Combined loading state for save/delete operations */
    const isProcessing = saveMutation.isPending || deleteMutation.isPending;


    /**
     * Handler: Toggle paper save/delete status in library.
     * 
     * When a paper is already saved, prompts for confirmation before deletion.
     * When a paper is not saved, immediately saves it without confirmation.
     * Prevents event propagation to avoid triggering parent click handlers.
     * 
     * @param {React.MouseEvent} e - Mouse event object
     */
    const handleToggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (paper.is_saved) {
            if (confirm(language === 'vi' ? "Xóa khỏi thư viện?" : "Remove from library?")) {
                deleteMutation.mutate(paper.paper_id);
            }
        } else {
            saveMutation.mutate(paper);
        }
    };


    /**
     * Handler: Trigger AI summary generation for the paper.
     * 
     * Sets flags to show the summary UI container even before the API responds.
     * Once a summary is generated, subsequent clicks are ignored to prevent
     * duplicate requests. On error, the UI remains visible to allow retry attempts.
     * Prevents event propagation to avoid triggering parent click handlers.
     * 
     * @param {React.MouseEvent} e - Mouse event object
     */
    const handleGenerateSummary = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Skip if summary has already been generated
        if (aiSummary) return;

        // Mark that user has requested a summary - UI will persist through loading/errors
        setHasRequested(true);
        setIsExpanded(true); 

        // Request AI summary with language context
        summaryMutation.mutate(
            { text: paper.summary, language: language === 'vi' ? 'Vietnamese' : 'English' },
            {
                onSuccess: (data) => {
                    setAiSummary(data.summary);
                }
                // On error, hasRequested remains true so error UI is displayed with retry button
            }
        );
    };


    /**
     * Compute formatted display date in the appropriate locale.
     * Uses UTC timezone to ensure consistent date representation across regions.
     * Format: "Month DD, YYYY" (e.g., "Jan 25, 2026" or "25 thg 1, 2026")
     */
    const displayDate = new Date(paper.published).toLocaleDateString(
        language === 'vi' ? 'vi-VN' : 'en-US', 
        { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }
    );

    return (
        <div className={`group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border ${paper.is_saved ? 'border-green-200 dark:border-green-900/50' : 'border-gray-100 dark:border-slate-800'}`}>
            <div className="p-6">
                {/* ===== HEADER SECTION: Title, Category, Save Button ===== */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            {/* Category badge with tooltip showing full description */}
                            <span 
                                className="px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded uppercase border border-blue-100 dark:border-blue-900 cursor-help"
                                title={`${getCategoryLabel(paper.category)}: ${getCategoryDesc(paper.category)}`}
                            >
                                {paper.category}
                            </span>
                            
                            {/* Save/Remove button - toggles paper save status */}
                            <button 
                                onClick={handleToggleSave}
                                disabled={isProcessing}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase flex items-center gap-1 transition-all ${
                                    paper.is_saved 
                                    ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600' 
                                    : 'text-gray-400 bg-gray-100 dark:bg-slate-800 hover:bg-green-100 hover:text-green-600'
                                }`}
                            >
                                {isProcessing ? <Loader2 size={10} className="animate-spin"/> : <Save size={10} />}
                                {paper.is_saved ? t.saved : "Save"}
                            </button>
                        </div>
                        
                        {/* Paper title - clickable to open PDF link */}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                            onClick={() => openExternal(paper.pdf_link)}
                        >
                            {paper.title}
                        </h3>
                    </div>
                </div>

                {/* ===== METADATA SECTION: Publication Date & Authors ===== */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {/* Publication date badge */}
                    <div className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        <Calendar size={12} />
                        <span>{displayDate}</span>
                    </div>
                    {/* Authors list - comma separated */}
                    <div className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                        {paper.authors.join(', ')}
                    </div>
                </div>

                {/* ===== EXPANDABLE CONTENT AREA: Abstract & AI Summary ===== */}
                <div className={`text-gray-600 dark:text-gray-300 text-sm leading-relaxed overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                    
                    {/* Original paper abstract with formatted text */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 mb-3">
                        {formatAbstract(paper.summary)}
                    </div>

                    {/* AI Summary Section - Conditionally rendered based on user request status */}
                    {/* Shows loading state, error with retry, or success content */}
                    {hasRequested && (
                        <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 ${
                            summaryMutation.isError 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                            : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-800/50'
                        }`}>
                            {/* Header with icon and title - changes color based on error state */}
                            <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${
                                summaryMutation.isError ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'
                            }`}>
                                <Sparkles size={14} /> AI Summary
                            </div>
                            
                            {/* State 1: Loading skeleton animation while summary is being generated */}
                            {summaryMutation.isPending && (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-3 bg-indigo-200 dark:bg-indigo-900/50 rounded w-3/4"></div>
                                    <div className="h-3 bg-indigo-200 dark:bg-indigo-900/50 rounded w-full"></div>
                                    <div className="h-3 bg-indigo-200 dark:bg-indigo-900/50 rounded w-5/6"></div>
                                </div>
                            )}

                            {/* State 2: Error message with retry button */}
                            {summaryMutation.isError && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-red-600 dark:text-red-300">
                                        {(summaryMutation.error as any)?.response?.data?.detail || "AI Processing Failed."}
                                    </p>
                                    {/* Retry button allows user to request summary again after error */}
                                    <button 
                                        onClick={handleGenerateSummary}
                                        className="self-start flex items-center gap-1 text-[10px] font-bold bg-white dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <RotateCcw size={10} /> Retry
                                    </button>
                                </div>
                            )}

                            {/* State 3: Successfully generated summary rendered as markdown */}
                            {aiSummary && !summaryMutation.isPending && (
                                <div className="text-sm text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ===== FOOTER SECTION: Action Buttons ===== */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                    {/* Expand/Collapse toggle button */}
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        {isExpanded ? <><ChevronUp size={14} /> {t.hideSummary}</> : <><ChevronDown size={14} /> {t.viewSummary}</>}
                    </button>

                    {/* Action buttons group */}
                    <div className="flex gap-2">
                        {/* AI Summarize button - disabled after summary is generated */}
                        <button 
                            onClick={handleGenerateSummary}
                            disabled={summaryMutation.isPending || !!aiSummary}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border ${
                                aiSummary 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300 cursor-default'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-indigo-400'
                            }`}
                        >
                            {summaryMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {aiSummary ? "AI Ready" : "Summarize"}
                        </button>

                        {/* Divider separator */}
                        <div className="w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                        {/* Open PDF button */}
                        <button 
                            onClick={() => openExternal(paper.pdf_link)} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" 
                            title="Open PDF"
                        >
                            <FileText size={18} />
                        </button>
                        
                        {/* Open ArXiv page button */}
                        <button 
                            onClick={() => openExternal(`https://arxiv.org/abs/${paper.paper_id}`)} 
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" 
                            title="ArXiv Page"
                        >
                            <ExternalLink size={18} />
                        </button>
                        
                        {/* Chat analysis button - opens chat modal with paper context */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                openChat(paper);
                            }}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 ml-1"
                        >
                            <MessageSquareText size={16} />
                            {t.chatAnalyze}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};