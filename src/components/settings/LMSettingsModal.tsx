/**
 * @fileoverview LMSettingsModal.tsx
 * Comprehensive settings interface for managing AI Providers, API Keys, 
 * Concurrency Limits, and specialized Task Routing.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
    X, Save, Check, Key, Loader2,
    BrainCircuit, Info, Globe, MessageSquare,
    Zap, TrendingUp, Terminal, ShieldCheck,
    Settings2, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLMSettings } from '../../hooks/useLMSettings';
import { LMSettingUpdate, LMTask } from '../../types/api';
import geminiIcon from '../../assets/gemini-icon.svg';
import ollamaIcon from '../../assets/ollama-icon.svg';
import openaiIcon from '../../assets/openai_icon.svg';
import openrouterIcon from '../../assets/openrouter-icon.svg';

/**
 * Configuration object for available AI/LM provider options.
 * Each provider includes metadata for UI rendering.
 */
const PROVIDERS = [
    { id: 'gemini', label: 'Google Gemini', iconSrc: geminiIcon, needsKey: true, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { id: 'openrouter', label: 'OpenRouter', iconSrc: openrouterIcon, needsKey: true, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { id: 'ollama', label: 'Ollama (Local)', iconSrc: ollamaIcon, needsKey: false, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
    { id: 'openai', label: 'OpenAI', iconSrc: openaiIcon, needsKey: true, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
];

/**
 * Metadata for each AI Task to provide better UX in the Routing section.
 */
const getTaskMetadata = (language: 'en' | 'vi'): Record<LMTask, { label: string; icon: any; color: string; desc: string }> => ({
    [LMTask.DEFAULT]: { 
        label: language === 'vi' ? "Mặc định" : "Global Default", 
        icon: Globe,
        color: "text-blue-500",
        desc: language === 'vi' ? "Mô hình dùng chính cho hệ thống" : "Primary system model"
    },
    [LMTask.SUMMARY]: { 
        label: language === 'vi' ? "Tóm tắt" : "Quick Summary", 
        icon: Zap,
        color: "text-amber-500",
        desc: language === 'vi' ? "Trích xuất & tóm tắt nhanh" : "Fast extraction & summary"
    },
    [LMTask.CHAT]: { 
        label: language === 'vi' ? "Hỏi đáp (Chat)" : "Deep Chat", 
        icon: MessageSquare,
        color: "text-indigo-500",
        desc: language === 'vi' ? "Nghiên cứu sâu tài liệu" : "Document research"
    },
    [LMTask.TREND]: { 
        label: language === 'vi' ? "Xu hướng" : "Trends", 
        icon: TrendingUp,
        color: "text-pink-500",
        desc: language === 'vi' ? "Phân tích xu hướng hàng loạt" : "Bulk trend analysis"
    },
    [LMTask.CODE]: { 
        label: language === 'vi' ? "Kiểm tra Mã" : "Code Tool", 
        icon: Terminal,
        color: "text-emerald-500",
        desc: language === 'vi' ? "Giải thích logic mã nguồn" : "Code logic analysis"
    },
});

/**
 * Sub-component for the Task Specific Routing grid.
 */
const TaskRoutingSection: React.FC = () => {
    const { data: settings, updateMutation } = useLMSettings();
    const { language } = useAppStore();
    const TASK_METADATA = getTaskMetadata(language);

    if (!settings) return null;

    // Filter providers that are ready (have key + model name)
    const readyProviders = PROVIDERS.filter(p => {
        const hasKey = settings.keys_status[p.id];
        const hasModel = !!settings.provider_configs[p.id]?.model;
        return hasKey && hasModel;
    });

    return (
        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <BrainCircuit size={20} className="text-purple-500" /> 
                        {language === 'vi' ? "Điều hướng Tác vụ AI" : "AI Task Routing"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {language === 'vi' ? "Gán các mô hình chuyên biệt cho từng loại công việc." : "Assign specialized models to optimize performance."}
                    </p>
                </div>
                
                {readyProviders.length === 0 && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                        <Info size={14} />
                        {language === 'vi' ? "CẦN CẤU HÌNH PROVIDER TRƯỚC" : "CONFIGURE PROVIDERS FIRST"}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(LMTask).map((taskId) => {
                    const meta = TASK_METADATA[taskId];
                    const Icon = meta.icon;
                    return (
                        <div 
                            key={taskId} 
                            className="flex flex-col p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 ${meta.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                        {meta.label}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">ID: {taskId}</span>
                                </div>
                            </div>

                            <div className="relative">
                                <select 
                                    value={settings.task_routing[taskId] || ""}
                                    onChange={(e) => {
                                        updateMutation.mutate({
                                            task_routing_update: { [taskId]: e.target.value }
                                        });
                                    }}
                                    className="w-full text-xs font-black bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none"
                                >
                                    <option value="" className="dark:bg-slate-900">
                                        {language === 'vi' ? "⚙️ Dùng Mặc định Hệ thống" : "⚙️ Use System Default"}
                                    </option>
                                    
                                    {readyProviders.map(p => (
                                        <option key={p.id} value={p.id} className="dark:bg-slate-900">
                                            {p.label.split(' ')[0]} ({settings.provider_configs[p.id]?.model})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronRight size={14} className="rotate-90" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-8 p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 flex items-start gap-4">
                <div className="p-2 bg-blue-500 rounded-lg text-white">
                    <ShieldCheck size={18} />
                </div>
                <div className="space-y-1">
                    <h5 className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">Pro Tip</h5>
                    <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 leading-relaxed font-medium">
                        {language === 'vi' 
                            ? "Sử dụng các mô hình 'Flash' cho Tóm tắt (Summary) để tiết kiệm chi phí, và các mô hình 'Pro' cho Deep Chat để đạt độ chính xác cao nhất." 
                            : "Use 'Flash' models for Summary to save tokens, and 'Pro' models for Deep Chat to ensure maximum research accuracy."}
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * Main LMSettingsModal Component
 */
export const LMSettingsModal: React.FC = () => {
    const { isSettingsOpen, closeSettings } = useAppStore();
    const { data: settings, isLoading, updateMutation } = useLMSettings();
    
    // Form States
    const [activeTab, setActiveTab] = useState<string>('gemini');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [modelName, setModelName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [concurrencyLimit, setConcurrencyLimit] = useState<number>(1);
    
    const hasSyncedRef = useRef(false);

    // Reset local states on close
    useEffect(() => {
        if (!isSettingsOpen) {
            hasSyncedRef.current = false;
            setApiKeyInput('');
        }
    }, [isSettingsOpen]);

    // Sync active tab with backend on open
    useEffect(() => {
        if (settings && isSettingsOpen && !hasSyncedRef.current) {
            if (settings.active_provider) setActiveTab(settings.active_provider);
            hasSyncedRef.current = true;
        }
    }, [settings, isSettingsOpen]);

    // Sync form fields when switching providers
    useEffect(() => {
        if (settings && activeTab) {
            const config = settings.provider_configs[activeTab] || {};
            setModelName(config.model || '');
            setBaseUrl(config.base_url || '');
            setConcurrencyLimit(config.concurrency_limit || 1);
            setApiKeyInput('');
        }
    }, [settings, activeTab]);

    const handleSave = () => {
        const payload: LMSettingUpdate = {
            active_provider: activeTab,
            config_update: {
                [activeTab]: {
                    model: modelName,
                    concurrency_limit: concurrencyLimit,
                    ...(baseUrl ? { base_url: baseUrl } : {})
                }
            }
        };

        if (apiKeyInput.trim()) {
            payload.api_key_update = { [activeTab]: apiKeyInput.trim() };
        }

        updateMutation.mutate(payload, {
            onSuccess: () => {
                setApiKeyInput('');
                hasSyncedRef.current = false; 
            }
        });
    };

    // 🚀 FIX: if isSettingsOpen is false, return null immediately
    if (!isSettingsOpen) return null;

    const currentProviderDef = PROVIDERS.find(p => p.id === activeTab);
    const isKeySaved = settings?.keys_status?.[activeTab] || false;
    const isSystemActive = settings?.active_provider === activeTab;

    return (
        /**
         * 🚀 FIX: Z-INDEX 99999 to be on top of everything.
         * Added backdrop-blur and pointer-events-auto to ensure interaction.
         */
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header Section */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">AI Intelligence Center</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Core Brain Configuration</p>
                        </div>
                    </div>
                    <button 
                        onClick={closeSettings} 
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white dark:bg-slate-900">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                            <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
                            <span className="text-sm font-bold tracking-widest uppercase">Synchronizing with Sidecar...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-10">
                            {/* Sidebar: Provider Selection */}
                            <div className="w-full lg:w-1/3 space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Available Engines</label>
                                <div className="space-y-2">
                                    {PROVIDERS.map(p => {
                                        const isThisActive = settings?.active_provider === p.id;
                                        const hasConfig = settings?.keys_status?.[p.id] || (!p.needsKey);

                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setActiveTab(p.id)}
                                                className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] transition-all border group ${
                                                    activeTab === p.id
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/25 scale-[1.02]'
                                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${activeTab === p.id ? 'bg-white/20' : 'bg-white dark:bg-slate-900 shadow-sm'} ${activeTab !== p.id ? p.color : 'text-white'}`}>
                                                        <img src={p.iconSrc} alt={p.label} className="w-5 h-5 object-contain" />
                                                    </div>
                                                    <span className="font-black text-sm">{p.label}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {hasConfig && <Check size={16} className={activeTab === p.id ? 'text-blue-200' : 'text-green-500'} />}
                                                    {isThisActive && (
                                                        <div className={`w-2.5 h-2.5 rounded-full ${activeTab === p.id ? 'bg-white' : 'bg-blue-600'} animate-pulse`} title="Active Engine"></div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Configuration Form */}
                            <div className="w-full lg:w-2/3 space-y-8">
                                <div className="space-y-6">
                                    {/* Provider Header Status */}
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-4 rounded-2xl ${currentProviderDef?.bgColor} ${currentProviderDef?.color}`}>
                                                {currentProviderDef && <img src={currentProviderDef.iconSrc} alt={currentProviderDef.label} className="w-7 h-7 object-contain" />}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    {currentProviderDef?.label}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                                                    <span className={`text-[10px] font-black uppercase ${isKeySaved ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {isKeySaved ? 'Verified' : 'Unconfigured'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {isSystemActive && (
                                            <div className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                                                CURRENT SYSTEM BRAIN
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Fields */}
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Model Name */}
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Model Identifier</label>
                                            <input 
                                                type="text" 
                                                value={modelName}
                                                onChange={(e) => setModelName(e.target.value)}
                                                placeholder={activeTab === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o'}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none text-slate-900 dark:text-white transition-all shadow-inner"
                                            />
                                        </div>

                                        {/* Base URL (Ollama Only) */}
                                        {currentProviderDef?.id === 'ollama' && (
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Connection Endpoint</label>
                                                <input 
                                                    type="text" 
                                                    value={baseUrl}
                                                    onChange={(e) => setBaseUrl(e.target.value)}
                                                    placeholder="http://localhost:11434"
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none text-slate-900 dark:text-white transition-all font-mono shadow-inner"
                                                />
                                            </div>
                                        )}

                                        {/* API Key */}
                                        {currentProviderDef?.needsKey && (
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security Token / API Key</label>
                                                <div className="relative">
                                                    <Key size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input 
                                                        type="password" 
                                                        value={apiKeyInput}
                                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                                        placeholder={isKeySaved ? "••••••••••••••••••••••••" : "Enter your secret key..."}
                                                        className={`w-full bg-slate-50 dark:bg-slate-950 border pl-14 pr-32 py-4 text-sm font-bold outline-none transition-all rounded-2xl shadow-inner ${
                                                            isKeySaved && !apiKeyInput 
                                                            ? 'border-emerald-200 dark:border-emerald-900/40' 
                                                            : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:text-white'
                                                        }`}
                                                    />
                                                    {isKeySaved && !apiKeyInput && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                                            <Check size={12} /> ENCRYPTED
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Concurrency Limit */}
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                                Concurrency Throttling <span title="Max parallel requests" className="cursor-help">
                                                    <Info size={12} className="text-slate-300" />
                                                </span>
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="range"
                                                    min={1} max={20}
                                                    value={concurrencyLimit}
                                                    onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                                                    className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                                <div className="w-16 h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-black text-blue-600 shadow-inner">
                                                    {concurrencyLimit}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Action Button */}
                                        <div className="pt-4">
                                            <button 
                                                onClick={handleSave}
                                                disabled={updateMutation.isPending}
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 group"
                                            >
                                                {updateMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                                                <span className="tracking-tight">{isSystemActive ? "Commit Changes" : "Save & Activate Engine"}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Task Routing Sub-component */}
                                <TaskRoutingSection /> 
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};