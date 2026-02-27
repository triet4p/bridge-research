import React, { useState } from 'react';
import { Github, Send, Loader2, Code2, Sparkles, Library } from 'lucide-react';
import { useAnalyzeRepo, useAllRepos, useDeleteRepo } from '../../hooks/useGithubInspector';
import { GithubRepoCard } from './GithubRepoCard';

export const CodeHubDashboard: React.FC = () => {
    const [url, setUrl] = useState('');

    const { data: repos, isLoading: isLoadingAll } = useAllRepos();
    const analyzeMutation = useAnalyzeRepo();
    const deleteMutation = useDeleteRepo();

    const handleAnalyze = () => {
        if (!url.trim() || analyzeMutation.isPending) return;
        analyzeMutation.mutate({ url: url.trim() }, {
            onSuccess: () => setUrl('')
        });
    };

    const handleDelete = (repoId: string) => {
        if (confirm('Xóa vĩnh viễn dữ liệu phân tích của repo này?')) {
            deleteMutation.mutate(repoId);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white border border-slate-800 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
                        <Sparkles size={14} /> AI-Powered Code Inspector
                    </div>

                    <h1 className="text-4xl font-black tracking-tight">
                        Explore <span className="text-blue-500">Implementations</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium max-w-lg mx-auto leading-relaxed">
                        Paste any GitHub URL to extract tech stacks, setup guides, and reusability scores using specialized AI Agents.
                    </p>

                    <div className="relative group mt-8">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                            <Github size={24} />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            placeholder="https://github.com/openclaw/openclaw"
                            className="w-full bg-black/40 border border-slate-700 focus:border-blue-500 rounded-[1.5rem] pl-14 pr-40 py-5 text-base font-bold outline-none transition-all shadow-inner"
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={!url.trim() || analyzeMutation.isPending}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {analyzeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {analyzeMutation.isPending ? 'Analyzing...' : 'Inspect'}
                        </button>
                    </div>

                    {analyzeMutation.isError && (
                        <p className="text-red-400 text-xs font-bold animate-pulse">
                            Error: {(analyzeMutation.error as any)?.response?.data?.detail || 'Failed to analyze repository.'}
                        </p>
                    )}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <Library size={20} className="text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Repo Library</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saved Inspections</p>
                        </div>
                    </div>
                    {repos && (
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500">
                            {repos.length} REPOS
                        </span>
                    )}
                </div>

                {isLoadingAll ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                        <p className="text-sm font-black uppercase tracking-[0.2em]">Synchronizing Code Hub...</p>
                    </div>
                ) : repos && repos.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {repos.map(repo => (
                            <GithubRepoCard
                                key={repo.repo_id}
                                repo={repo}
                                onRemove={handleDelete}
                                removeLabel="Delete Analysis"
                                isRemoving={deleteMutation.isPending && deleteMutation.variables === repo.repo_id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mb-6 text-slate-300">
                            <Code2 size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Code Found</h4>
                        <p className="text-slate-400 text-xs font-medium mt-2">Start by inspecting your first GitHub repository above.</p>
                    </div>
                )}
            </section>
        </div>
    );
};
