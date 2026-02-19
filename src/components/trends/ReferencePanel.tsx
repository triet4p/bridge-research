import React from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import { TrendPaperReference } from '../../types/api';
import { openExternal } from '../../utils/openLink';

interface Props {
    category: string;
    papers: TrendPaperReference[];
    onClose: () => void;
}

export const ReferencePanel: React.FC<Props> = ({ category, papers, onClose }) => {
    const openPaper = (paperId: string) => {
        openExternal(`https://arxiv.org/abs/${paperId}`);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <FileText size={18} />
                    <h4 className="font-black text-sm uppercase tracking-wider">References: {category}</h4>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                    {papers.map((paper, idx) => (
                        <div 
                            key={idx}
                            onClick={() => openPaper(paper.id)}
                            className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-800 rounded-xl transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug group-hover:text-blue-600 transition-colors">
                                    {paper.title}
                                </span>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400 font-mono">{paper.id}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
