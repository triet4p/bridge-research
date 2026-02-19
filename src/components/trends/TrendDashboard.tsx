import React, { useState } from 'react';
import { useTrends } from '../../hooks/useTrends';
import { TrendRadarChart } from './TrendRadarChat';
import { useAppStore } from '../../stores/useAppStore';
import { Loader2, Sparkles, Zap, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const TrendDashboard: React.FC = () => {
    const { filters } = useAppStore();
    const { historyQuery, startMutation, statusData, activeTrendTaskId, resetPolling } = useTrends();
    const [days, setDays] = useState(7);
    const [maxPapers, setMaxPapers] = useState(150);

    const handleGenerate = () => {
        // Reset previous state
        resetPolling();
        startMutation.mutate({
            days,
            categories: filters.categories,
            max_papers: maxPapers
        });
    };

    // Determine current state
    const isProcessing = !!activeTrendTaskId && statusData?.status !== 'completed' && statusData?.status !== 'failed';
    const progress = statusData?.progress || 0;
    const statusMessage = statusData?.message || "Initializing...";
    
    // Get result either from completed task OR history
    const latestTrend = (statusData?.status === 'completed' ? statusData.result : null) 
                        || (historyQuery.data && historyQuery.data[0]);

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* 1. Header Card */}
            <div className="bg-slate-900 dark:bg-blue-950/20 rounded-[2rem] p-6 text-white border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                        <Sparkles className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Trend Radar</h2>
                        <p className="text-slate-400 text-xs">Deep-scanning ArXiv for technological shifts</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    <select 
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bg-transparent text-sm font-bold outline-none px-4 py-2 cursor-pointer"
                    >
                        <option value={7} className="text-slate-900">7 Days</option>
                        <option value={30} className="text-slate-900">30 Days</option>
                    </select>

                    {/* FIX 1: Thêm lại input Max Papers để dùng setMaxPapers */}
                    <div className="flex items-center gap-2 px-4 py-2 border-l border-white/10">
                        <input 
                            type="number"
                            value={maxPapers}
                            onChange={(e) => setMaxPapers(Number(e.target.value))}
                            min={10} max={500} step={10}
                            className="bg-transparent text-sm font-black outline-none w-12 text-center text-blue-400"
                        />
                        <span className="text-[10px] uppercase font-bold text-slate-500">Papers</span>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={startMutation.isPending || isProcessing}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                        Analyze
                    </button>
                </div>
            </div>

            {/* FIX 2: Thêm lại Progress Bar UI để dùng progress và statusMessage */}
            {isProcessing && (
                <div className="py-12 max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 block">System Status</span>
                            <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 italic">"{statusMessage}"</h4>
                        </div>
                        <span className="text-2xl font-black text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-1 border border-slate-100 dark:border-slate-700 shadow-inner">
                        <div 
                            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        AI Agents are mapping the research landscape...
                    </p>
                </div>
            )}

            {/* 2. Main Content Grid */}
            {!isProcessing && latestTrend && (
                <div className="grid grid-cols-12 gap-8 items-start">
                    
                    {/* CỘT TRÁI (40%): Radar & Hot Techniques */}
                    <div className="col-span-12 lg:col-span-5 space-y-8">
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <BarChart3 size={16} /> Domain Distribution
                                </h3>
                                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-2 py-0.5 rounded-full">
                                    {latestTrend.paper_count} Papers
                                </span>
                            </div>
                            <TrendRadarChart data={latestTrend.domain_distribution} />
                        </section>

                        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Hot Techniques</h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(latestTrend.top_techniques).map(([tech, count]) => (
                                    <div key={tech} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all cursor-default group">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600">{tech}</span>
                                        <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 w-5 h-5 flex items-center justify-center rounded-lg shadow-sm">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* CỘT PHẢI (60%): AI Report */}
                    <div className="col-span-12 lg:col-span-7">
                        <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                                <h3 className="font-black text-lg tracking-tight">AI Intelligence Report</h3>
                            </div>
                            <div className="p-10 prose dark:prose-invert prose-slate max-w-none 
                                prose-headings:font-black prose-headings:tracking-tight 
                                prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-p:leading-relaxed
                                prose-strong:text-blue-600 dark:prose-strong:text-blue-400">
                                <ReactMarkdown>{latestTrend.report_markdown}</ReactMarkdown>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};