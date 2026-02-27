import React, { useState } from 'react';
import { Github, Send, Loader2, Code2, AlertCircle } from 'lucide-react';
import { useAnalyzeRepo, usePaperRepos, useUnlinkRepo } from '../../hooks/useGithubInspector';
import { GithubRepoCard } from '../github/GithubRepoCard';
import { LocalPaper } from '../../types/api';

interface Props {
    paper: LocalPaper;
}

export const ImplementationTab: React.FC<Props> = ({ paper }) => {
    const [url, setUrl] = useState('');
    
    // Hooks dữ liệu
    const { data: repos, isLoading: isLoadingRepos } = usePaperRepos(paper.paper_id);
    const analyzeMutation = useAnalyzeRepo();
    const unlinkMutation = useUnlinkRepo();

    const handleAnalyze = () => {
        if (!url.trim() || analyzeMutation.isPending) return;
        
        analyzeMutation.mutate({
            url: url.trim(),
            paper_id: paper.paper_id
        }, {
            onSuccess: () => setUrl('') // Xóa input sau khi xong
        });
    };

    const handleUnlink = (repoId: string) => {
        if (confirm("Hủy liên kết repo này khỏi bài báo? (Dữ liệu phân tích vẫn sẽ còn trong hệ thống)")) {
            unlinkMutation.mutate({ paperId: paper.paper_id, repoId });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in duration-300">
            {/* Input Area */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="max-w-2xl mx-auto">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                        Analyze Source Code (Github URL)
                    </label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Github size={20} />
                        </div>
                        <input 
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            placeholder="https://github.com/owner/repository"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-2xl pl-12 pr-32 py-4 text-sm font-bold outline-none shadow-sm transition-all dark:text-white"
                        />
                        <button 
                            onClick={handleAnalyze}
                            disabled={!url.trim() || analyzeMutation.isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            {analyzeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
                        </button>
                    </div>
                    
                    {analyzeMutation.isError && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold animate-in slide-in-from-top-1">
                            <AlertCircle size={14} />
                            {(analyzeMutation.error as any)?.response?.data?.detail || "Failed to analyze repository."}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoadingRepos ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                        <p className="text-sm font-bold uppercase tracking-widest">Loading Implementations...</p>
                    </div>
                ) : repos && repos.length > 0 ? (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Code2 size={18} className="text-blue-500" />
                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                                Linked Repositories ({repos.length})
                            </h4>
                        </div>
                        {repos.map(repo => (
                            <GithubRepoCard 
                                key={repo.repo_id} 
                                repo={repo} 
                                onRemove={handleUnlink}
                                removeLabel="Unlink from Paper"
                                isRemoving={unlinkMutation.isPending && unlinkMutation.variables?.repoId === repo.repo_id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4">
                            <Github size={40} />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center max-w-xs">
                            No GitHub repositories linked to this paper yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};