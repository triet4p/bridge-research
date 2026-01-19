// src/components/paper/PaperCard.tsx
import React, { useState } from 'react';
import { Paper } from '../../types/api';
import { Calendar, FileText, ChevronDown, ChevronUp, ExternalLink, Save, MessageSquareText, Loader2 } from 'lucide-react';
import { openExternal } from '../../utils/openLink';
import { formatAbstract } from '../../utils/textFormatter';
import { useAppStore } from '../../stores/useAppStore';
import { getCategoryLabel, getCategoryDesc } from '../../constants/defaults';
import { useSavePaper, useDeletePaper } from '../../hooks/usePapers'; // Import Hooks

interface PaperCardProps {
    paper: Paper;
    onChat?: (paper: Paper) => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onChat }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t, language } = useAppStore();
    
    // Mutations
    const saveMutation = useSavePaper();
    const deleteMutation = useDeletePaper();

    const isProcessing = saveMutation.isPending || deleteMutation.isPending;

    const handleToggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (paper.is_downloaded) {
            if (confirm(language === 'vi' ? "Xóa khỏi thư viện?" : "Remove from library?")) {
                deleteMutation.mutate(paper.paper_id);
            }
        } else {
            saveMutation.mutate(paper);
        }
    };

    const displayDate = new Date(paper.published).toLocaleDateString(
        language === 'vi' ? 'vi-VN' : 'en-US', 
        { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }
    );

    return (
        <div className={`group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border ${paper.is_downloaded ? 'border-green-200 dark:border-green-900/50' : 'border-gray-100 dark:border-slate-800'}`}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span 
                                className="px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded uppercase border border-blue-100 dark:border-blue-900 cursor-help"
                                title={`${getCategoryLabel(paper.category)}: ${getCategoryDesc(paper.category)}`}
                            >
                                {paper.category}
                            </span>
                            {/* --- Nút Save/Saved --- */}
                            <button 
                                onClick={handleToggleSave}
                                disabled={isProcessing}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase flex items-center gap-1 transition-all ${
                                    paper.is_downloaded 
                                    ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600' 
                                    : 'text-gray-400 bg-gray-100 dark:bg-slate-800 hover:bg-green-100 hover:text-green-600'
                                }`}
                            >
                                {isProcessing ? <Loader2 size={10} className="animate-spin"/> : (paper.is_downloaded ? <Save size={10} /> : <Save size={10} />)}
                                {paper.is_downloaded ? t.saved : "Save"}
                            </button>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                            onClick={() => openExternal(paper.pdf_link)}
                        >
                            {paper.title}
                        </h3>
                    </div>
                </div>

                {/* Metadata & Abstract (Giữ nguyên) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        <Calendar size={12} />
                        <span>{displayDate}</span>
                    </div>
                    <div className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                        {paper.authors.join(', ')}
                    </div>
                </div>

                <div className={`text-gray-600 dark:text-gray-300 text-sm leading-relaxed overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                        {formatAbstract(paper.summary)}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        {isExpanded ? <><ChevronUp size={14} /> {t.hideSummary}</> : <><ChevronDown size={14} /> {t.viewSummary}</>}
                    </button>

                    <div className="flex gap-2">
                        {/* Các nút PDF/ArXiv cũ */}
                        <button onClick={() => openExternal(paper.pdf_link)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Open PDF"><FileText size={18} /></button>
                        <button onClick={() => openExternal(`https://arxiv.org/abs/${paper.paper_id}`)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="ArXiv Page"><ExternalLink size={18} /></button>
                        
                        <button 
                            onClick={() => onChat?.(paper)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95"
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