import React, { useState } from 'react';
import { useTrends } from '../../hooks/useTrends';
import { TrendRadarChart } from './TrendRadarChart';
import { ReferencePanel } from './ReferencePanel';
import { useAppStore } from '../../stores/useAppStore';
import { Loader2, Sparkles, Zap, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const TrendDashboard: React.FC = () => {
    const { filters } = useAppStore();
    const { historyQuery, startMutation, statusData, activeTrendTaskId, resetPolling } = useTrends();
    
    // State để theo dõi người dùng đang xem tham chiếu của chủ đề nào
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedReferenceType, setSelectedReferenceType] = useState<'domain' | 'technique' | null>(null);
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

    const handleDomainAxisClick = (domain: string) => {
        if (selectedReferenceType === 'domain' && selectedCategory === domain) {
            setSelectedCategory(null);
            setSelectedReferenceType(null);
            return;
        }
        setSelectedCategory(domain);
        setSelectedReferenceType('domain');
    };

    const handleTechniqueClick = (technique: string) => {
        if (selectedReferenceType === 'technique' && selectedCategory === technique) {
            setSelectedCategory(null);
            setSelectedReferenceType(null);
            return;
        }
        setSelectedCategory(technique);
        setSelectedReferenceType('technique');
    };

    // Determine current state
    const isProcessing = !!activeTrendTaskId && statusData?.status !== 'completed' && statusData?.status !== 'failed';
    const progress = statusData?.progress || 0;
    const statusMessage = statusData?.message || "Initializing...";

    // Get result either from completed task OR history
    const latestTrend = (statusData?.status === 'completed' ? statusData.result : null)
                        || (historyQuery.data && historyQuery.data[0]);

    console.log("Latest trend data:", latestTrend);

    const selectedReferences =
        selectedReferenceType === 'domain'
            ? latestTrend?.domain_references[selectedCategory || '']
            : selectedReferenceType === 'technique'
                ? latestTrend?.technique_references[selectedCategory || '']
                : undefined;

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
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

            {/* Progress Bar */}
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

            {/* Main Content Grid */}
            {!isProcessing && latestTrend && (
                <div className="grid grid-cols-12 gap-8 items-start">
                    
                    {/* CỘT TRÁI (40%): Radar & Tech & References */}
                    <div className="col-span-12 lg:col-span-6 space-y-8 min-w-0">
                        
                        {/* 1. Radar Chart Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <BarChart3 size={16} /> Domain Distribution
                                </h3>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-2 py-0.5 rounded-full">
                                        Click axes to see papers
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <TrendRadarChart 
                                    data={latestTrend.domain_distribution} 
                                    onAxisClick={handleDomainAxisClick}
                                />
                            </div>
                        </section>

                        {/* 2. Reference Panel (Hiển thị động khi click) */}
                        {selectedCategory && selectedReferences && (
                            <ReferencePanel 
                                category={selectedCategory}
                                papers={selectedReferences}
                                onClose={() => {
                                    setSelectedCategory(null);
                                    setSelectedReferenceType(null);
                                }}
                            />
                        )}

                        {/* 3. Hot Techniques Section */}
                        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Hot Techniques</h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(latestTrend.top_techniques).map(([tech, count]) => (
                                    <button 
                                        key={tech} 
                                        onClick={() => handleTechniqueClick(tech)}
                                        className={`flex items-center gap-2 px-4 py-2 border rounded-2xl transition-all active:scale-95 group ${
                                            selectedReferenceType === 'technique' && selectedCategory === tech 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                        }`}
                                    >
                                        <span className={`text-xs font-bold ${selectedReferenceType === 'technique' && selectedCategory === tech ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {tech}
                                        </span>
                                        <span className={`text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-lg ${
                                            selectedReferenceType === 'technique' && selectedCategory === tech ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 shadow-sm'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* CỘT PHẢI: AI Deep Report */}
                    <div className="col-span-12 lg:col-span-6 min-w-0">
                        <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden min-h-[800px]">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                                    <h3 className="font-black text-lg tracking-tight italic text-slate-900 dark:text-white">AI Intelligence Report</h3>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Generated by Research Agent
                                </div>
                            </div>

                            {/* PHẦN FIX CHỮ ĐEN Ở ĐÂY */}
                            <div className="p-10 prose dark:prose-invert prose-slate max-w-none 
                                /* Chỉ giữ lại các class điều hướng style, KHÔNG ép màu thủ công */
                                prose-p:leading-relaxed prose-p:text-lg
                                /* Ép Header và Chữ đậm về màu sáng trong Dark mode */
                                dark:prose-headings:text-white 
                                dark:prose-strong:text-blue-400 
                                dark:text-slate-200">
                                
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({node, ...props}) => (
                                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-8 border-b-2 border-blue-500 pb-4" {...props} />
                                        ),
                                        h2: ({node, ...props}) => (
                                            <h2 className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-400 mt-12 mb-6 flex items-center gap-3 before:content-[''] before:w-2 before:h-6 before:bg-blue-500 before:rounded-full" {...props} />
                                        ),
                                        table: ({node, ...props}) => (
                                            <div className="overflow-x-auto my-8 rounded-xl border border-slate-200 dark:border-slate-700">
                                                <table className="w-full border-collapse bg-white dark:bg-slate-900" {...props} />
                                            </div>
                                        ),
                                        th: ({node, ...props}) => (
                                            <th className="bg-slate-50 dark:bg-slate-800 px-4 py-3 font-bold text-left border-b border-slate-200 dark:border-slate-700" {...props} />
                                        ),
                                        td: ({node, ...props}) => (
                                            <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800" {...props} />
                                        )
                                    }}
                                >
                                    {latestTrend.report_markdown}
                                </ReactMarkdown>
                            </div>
                        </section>
                    </div>
                    
                </div>
            )}
        </div>
    );
};