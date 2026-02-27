import React, { useState } from 'react';
import { GithubRepoResponse } from '../../types/api';
import { 
    Github, Star, GitBranch, Cpu, Layers, 
    Trash2, ExternalLink, ChevronDown, ChevronUp, Terminal, Loader2,
    Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { openExternal } from '../../utils/openLink';

const AnalysisCard = ({ 
    icon: Icon, 
    title, 
    status, 
    description, 
    colorClass 
}: { 
    icon: any, 
    title: string, 
    status: string, 
    description: string, 
    colorClass: string 
}) => {
    const [showReasoning, setShowReasoning] = useState(false);

    return (
        <div 
            onClick={() => description && setShowReasoning(!showReasoning)}
            className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 cursor-pointer group/card ${colorClass} ${
                showReasoning ? 'ring-2 ring-current ring-offset-2 dark:ring-offset-slate-900' : 'hover:shadow-md'
            }`}
        >
            <div className="flex items-center justify-between mb-2 opacity-80 h-5">
                <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
                </div>
                {description && (
                    <Info size={12} className={`transition-transform ${showReasoning ? 'rotate-180' : 'opacity-0 group-hover/card:opacity-100'}`} />
                )}
            </div>
            
            <div className="h-8 flex items-center">
                <span className="text-base font-black uppercase italic tracking-tight">
                    {status}
                </span>
            </div>

            {showReasoning && description && (
                <div className="mt-3 pt-3 border-t border-current/10 animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-xs font-medium opacity-90 leading-relaxed">
                        {description}
                    </p>
                </div>
            )}
        </div>
    );
};


interface GithubRepoCardProps {
    /** Dữ liệu Repo được phân tích */
    repo: GithubRepoResponse;
    /** Hàm callback khi user bấm nút xóa/hủy liên kết */
    onRemove?: (repoId: string) => void;
    /** Nhãn cho nút xóa (VD: "Delete" hoặc "Unlink") */
    removeLabel?: string;
    /** Trạng thái loading khi đang xóa */
    isRemoving?: boolean;
}

/**
 * Component hiển thị thông tin phân tích mã nguồn Github.
 * Tái sử dụng được ở cả View độc lập và View theo ngữ cảnh (Paper).
 */
export const GithubRepoCard: React.FC<GithubRepoCardProps> = ({ 
    repo, 
    onRemove, 
    removeLabel = "Delete",
    isRemoving = false 
}) => {
    // Trạng thái mở rộng để xem Tutorial/Summary
    const [isExpanded, setIsExpanded] = useState(false);

    // Xử lý màu sắc cho độ khó (Complexity)
    const getComplexityColor = (complexity: string) => {
        const c = complexity.toLowerCase();
        if (c.includes('easy')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        if (c.includes('hard')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'; // Medium
    };

    // Xử lý màu sắc cho khả năng tái sử dụng (Reusability)
    const getReusabilityColor = (reusability: string) => {
        const r = reusability.toLowerCase();
        if (r.includes('high')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        if (r.includes('low')) return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400 border-gray-200 dark:border-slate-700';
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'; // Medium
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-lg">
            {/* ===== HEADER ===== */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 mt-1">
                            <Github size={24} />
                        </div>
                        <div>
                            <h3 
                                onClick={() => openExternal(repo.url)}
                                className="text-lg font-black text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                            >
                                {repo.repo_id}
                                <ExternalLink size={14} className="text-slate-400" />
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {repo.description || "No description provided."}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 text-amber-500">
                                    <Star size={14} className="fill-amber-500" /> {repo.stars.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <GitBranch size={14} /> {repo.default_branch}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Button */}
                    {onRemove && (
                        <button 
                            onClick={() => onRemove(repo.repo_id)}
                            disabled={isRemoving}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-50"
                            title={removeLabel}
                        >
                            {isRemoving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* ===== ANALYSIS METADATA (SMART CARDS) ===== */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-6">
                    
                    <AnalysisCard 
                        icon={Terminal}
                        title="Setup Complexity"
                        status={repo.complexity.includes('-') ? repo.complexity.split('-')[0].trim() : repo.complexity}
                        description={repo.complexity.includes('-') ? repo.complexity.split('-').slice(1).join('-').trim() : ""}
                        colorClass={getComplexityColor(repo.complexity)}
                    />

                    <AnalysisCard 
                        icon={Layers}
                        title="Reusability"
                        status={repo.reusability.includes('-') ? repo.reusability.split('-')[0].trim() : repo.reusability}
                        description={repo.reusability.includes('-') ? repo.reusability.split('-').slice(1).join('-').trim() : ""}
                        colorClass={getReusabilityColor(repo.reusability)}
                    />

                    <AnalysisCard 
                        icon={Cpu}
                        title="Hardware"
                        status="Requirements"
                        description={repo.hardware_req}
                        colorClass="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
                    />
                </div>

                {/* Tech Stack Tags - Giữ nguyên nhưng thêm padding trên cho thoáng */}
                <div className="pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">Tech Stack</span>
                    <div className="flex flex-wrap gap-2">
                        {repo.tech_stack.map((tech, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== EXPANDABLE MARKDOWN SUMMARY ===== */}
            <div className="border-t border-slate-100 dark:border-slate-800">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <span className="uppercase tracking-widest">Executive Summary & Tutorial</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {isExpanded && (
                    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <div className="prose prose-sm dark:prose-invert prose-slate max-w-none 
                            text-slate-800 dark:text-slate-200
                            prose-p:leading-relaxed prose-p:text-sm
                            prose-headings:text-slate-900 dark:prose-headings:text-white
                            prose-strong:text-slate-900 dark:prose-strong:text-blue-400
                            prose-code:text-blue-600 dark:prose-code:text-blue-400
                            prose-li:my-0">
                            
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({node, ...props}) => (
                                        <h1 className="text-xl font-black tracking-tight mb-4 border-b border-slate-200 dark:border-slate-700 pb-2" {...props} />
                                    ),
                                    h2: ({node, ...props}) => (
                                        <h2 className="text-lg font-black tracking-tight text-blue-600 dark:text-blue-400 mt-6 mb-3 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-5 before:bg-blue-500 before:rounded-full" {...props} />
                                    ),
                                    h3: ({node, ...props}) => (
                                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2" {...props} />
                                    ),
                                    ul: ({node, ...props}) => (
                                        <ul className="list-disc pl-5 space-y-1 mb-4" {...props} />
                                    ),
                                    ol: ({node, ...props}) => (
                                        <ol className="list-decimal pl-5 space-y-1 mb-4" {...props} />
                                    ),
                                    // li: ({node, ...props}) => (
                                    //     <li className="text-sm" {...props} />
                                    // ),
                                    code: ({node, ...props}) => (
                                        <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200 dark:border-slate-700" {...props} />
                                    ),
                                    pre: ({node, ...props}) => (
                                        <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <pre className="bg-slate-50 dark:bg-slate-950 p-4 overflow-x-auto !m-0" {...props} />
                                        </div>
                                    ),
                                    table: ({node, ...props}) => (
                                        <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <table className="w-full border-collapse bg-white dark:bg-slate-900 text-xs" {...props} />
                                        </div>
                                    ),
                                    th: ({node, ...props}) => (
                                        <th className="bg-slate-50 dark:bg-slate-800 px-3 py-2 font-bold text-left border-b border-slate-200 dark:border-slate-700" {...props} />
                                    ),
                                    td: ({node, ...props}) => (
                                        <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800" {...props} />
                                    )
                                }}
                            >
                                {repo.summary_markdown}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};