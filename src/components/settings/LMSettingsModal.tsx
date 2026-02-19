// src/components/settings/LMSettingsModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { X, Save, Check, Key, Server, Cpu, Loader2, BrainCircuit, Info, Globe, MessageSquare, Zap, TrendingUp, Terminal, Box } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLMSettings } from '../../hooks/useLMSettings';
import { LMSettingUpdate, LMTask } from '../../types/api';

/**
 * Configuration object for available AI/LM provider options.
 */
const PROVIDERS = [
    { id: 'gemini', label: 'Google Gemini', icon: Cpu, needsKey: true, color: 'text-orange-500' },
    { id: 'openrouter', label: 'OpenRouter', icon: Box, needsKey: true, color: 'text-purple-500' },
    { id: 'ollama', label: 'Ollama (Local)', icon: Server, needsKey: false, color: 'text-gray-500' },
    { id: 'openai', label: 'OpenAI', icon: BrainCircuit, needsKey: true, color: 'text-emerald-500' },
];

/**
 * Task Specific Routing Section
 * Allows users to assign specific models to specific tasks.
 */
const TaskRoutingSection = () => {
    const { data: settings, updateMutation } = useLMSettings();
    const { language } = useAppStore();

    if (!settings) return null;

    const readyProviders = PROVIDERS.filter(p => {
        const hasKey = settings.keys_status[p.id];
        const hasModel = !!settings.provider_configs[p.id]?.model;
        return hasKey && hasModel;
    });

    const TASK_METADATA: Record<LMTask, { label: string; icon: any; color: string; desc: string }> = {
        [LMTask.DEFAULT]: { 
            label: language === 'vi' ? "Mặc định" : "Global Default", 
            icon: Globe,
            color: "text-blue-500",
            desc: language === 'vi' ? "Mô hình dùng chính cho app" : "Primary system model"
        },
        [LMTask.SUMMARY]: { 
            label: language === 'vi' ? "Tóm tắt" : "Quick Summary", 
            icon: Zap,
            color: "text-amber-500",
            desc: language === 'vi' ? "Tóm tắt báo chí nhanh" : "Extraction & summary"
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
            desc: language === 'vi' ? "Phân tích hàng loạt" : "Bulk trend analysis"
        },
        [LMTask.CODE]: { 
            label: language === 'vi' ? "Kiểm tra Mã" : "Code Tool", 
            icon: Terminal,
            color: "text-emerald-500",
            desc: language === 'vi' ? "Giải thích code" : "Code logic analysis"
        },
    };

    return (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-5">
                <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <BrainCircuit size={18} className="text-purple-500" /> 
                        {language === 'vi' ? "Điều hướng Model Thông minh" : "AI Task Routing"}
                    </h4>
                    <p className="text-[10px] text-gray-400">
                        {language === 'vi' ? "Gán model tối ưu nhất cho từng loại tác vụ." : "Assign specialized models to different tasks."}
                    </p>
                </div>
                
                {readyProviders.length === 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                        <Info size={12} />
                        {language === 'vi' ? "Cần cấu hình Model trước" : "Configure Model first"}
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
                            className="flex flex-col p-4 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-white dark:hover:bg-slate-800/60 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 ${meta.color}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {meta.label}
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">ID: {taskId}</span>
                                    </div>
                                </div>
                            </div>

                            <select 
                                value={settings.task_routing[taskId] || ""}
                                onChange={(e) => {
                                    updateMutation.mutate({
                                        task_routing_update: { [taskId]: e.target.value }
                                    });
                                }}
                                className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer disabled:opacity-50 appearance-none"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundSize: '1rem'
                                }}
                            >
                                <option value="">
                                    {language === 'vi' ? "⚙️ Dùng Hệ thống" : "⚙️ Use System Default"}
                                </option>
                                
                                {readyProviders.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.label.split(' ')[0]} ({settings.provider_configs[p.id]?.model})
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-start gap-2 italic">
                    <Info size={14} className="shrink-0" />
                    <span>
                        {language === 'vi' 
                            ? "Chỉ các Provider đã được lưu Key và nhập tên Model mới xuất hiện trong danh sách này. Bạn có thể gán các model 'to' cho Deep Chat và các model 'flash' cho Summary để tối ưu chi phí và tốc độ." 
                            : "Only providers with valid keys and model names are listed. Pro tip: Assign heavy models to Deep Chat and fast 'flash' models to Summary for better cost/speed balance."}
                    </span>
                </p>
            </div>
        </div>
    );
};

/**
 * Modal component for managing Language Model (LM) settings and provider configurations.
 * 
 * This component allows users to:
 * - View and switch between different AI providers (Gemini, OpenRouter, Ollama, OpenAI)
 * - Configure provider-specific settings (model name, base URL, API keys)
 * - Save and activate selected provider configurations
 * - Manage API keys securely with visual feedback on saved keys
 * 
 * The component uses memoization and refs to prevent unnecessary re-renders and
 * manage synchronization between the modal state and backend configuration.
 * 
 * @component
 * @returns {React.ReactElement|null} The rendered modal component or null if not open
 */
export const LMSettingsModal: React.FC = () => {
    const { isSettingsOpen, closeSettings } = useAppStore();
    const { data: settings, isLoading, updateMutation } = useLMSettings();
    
    // ===== Local component state =====
    /** Currently selected provider tab identifier */
    const [activeTab, setActiveTab] = useState<string>('gemini');
    /** Temporary API key input from user (not submitted until save) */
    const [apiKeyInput, setApiKeyInput] = useState('');
    /** Temporary model name input from user */
    const [modelName, setModelName] = useState('');
    /** Temporary base URL input from user (used for Ollama local deployment) */
    const [baseUrl, setBaseUrl] = useState('');
    const [concurrencyLimit, setConcurrencyLimit] = useState<number>(1);
    
    /** Flag to track whether initial data synchronization from backend has occurred */
    const hasSyncedRef = useRef(false);

    /**
     * Effect: Reset modal state when settings modal opens or closes.
     * Clears temporary form inputs and resets the sync flag to enable fresh data sync.
     * This ensures a clean state each time the modal is opened.
     */
    useEffect(() => {
        if (!isSettingsOpen) {
            hasSyncedRef.current = false;
            setApiKeyInput('');
        } else {
            hasSyncedRef.current = false;
        }
    }, [isSettingsOpen]);

    /**
     * Effect: Synchronize the active provider tab with backend configuration.
     * On initial load or when settings are fetched, automatically switch to the
     * currently active provider in the backend. Uses hasSyncedRef to prevent
     * duplicate synchronization on re-renders.
     */
    useEffect(() => {
        if (settings && isSettingsOpen && !hasSyncedRef.current) {
            // Switch to the active provider from backend if available
            if (settings.active_provider) {
                setActiveTab(settings.active_provider);
            }
            // Mark synchronization as complete to prevent re-syncing
            hasSyncedRef.current = true;
        }
    }, [settings, isSettingsOpen]);

    /**
     * Effect: Populate form fields with selected provider's configuration.
     * When the active tab changes, fetch the provider's stored configuration
     * from the backend and update local form state. Clears API key input
     * for security (keys are never displayed, only saved status).
     */
    useEffect(() => {
        if (settings && activeTab) {
            // Retrieve provider configuration from backend, fallback to empty object if not found
            const config = settings.provider_configs[activeTab] || {};
            setModelName(config.model || '');
            setBaseUrl(config.base_url || '');
            setApiKeyInput(''); // Clear API key for security
            setConcurrencyLimit(config.concurrency_limit || 1);
        }
    }, [settings, activeTab]);

    /**
     * Handler: Save provider configuration and API keys to the backend.
     * 
     * Constructs a payload containing:
     * - The provider to activate (sets as active provider)
     * - Model name and optional base URL for the provider
     * - API key if a new one was entered
     * 
     * On successful save, clears the API key input and resets the sync flag
     * to trigger UI updates reflecting the new active provider status.
     */
    const handleSave = () => {
        // Build configuration update payload
        const payload: LMSettingUpdate = {
            active_provider: activeTab, // Saving activates this provider
            config_update: {
                [activeTab]: {
                    model: modelName,
                    concurrency_limit: concurrencyLimit,
                    ...(baseUrl ? { base_url: baseUrl } : {})
                }
            }
        };

        // Only include API key update if a new key was entered
        if (apiKeyInput.trim()) {
            payload.api_key_update = { [activeTab]: apiKeyInput.trim() };
        }

        updateMutation.mutate(payload, {
            onSuccess: () => {
                setApiKeyInput(''); // Clear input field after successful save
                // Reset sync flag to force UI update with new active provider status
                hasSyncedRef.current = false; 
            }
        });
    };

    // Return null if modal is not open to unmount component and avoid rendering
    if (!isSettingsOpen) return null;

    // ===== Derived state (computed from local and backend state) =====
    /** Current provider definition based on active tab */
    const currentProviderDef = PROVIDERS.find(p => p.id === activeTab);
    /** Whether an API key has been saved for the current provider */
    const isKeySaved = settings?.keys_status?.[activeTab] || false;
    /** Whether the current provider is set as active in the system */
    const isSystemActive = settings?.active_provider === activeTab;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Cpu className="text-blue-500" /> AI Configuration
                    </h3>
                    <button onClick={closeSettings} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                            <Loader2 className="animate-spin mb-2 text-blue-500" />
                            <span className="text-xs">Loading configuration...</span>
                        </div>
                    ) : (
                        <div className="flex gap-8">
                            {/* Sidebar List */}
                            <div className="w-1/3 space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Available Providers</label>
                                {/* Render provider list buttons */}
                                <div className="space-y-1.5">
                                    {PROVIDERS.map(p => {
                                        /** Check if this provider is the currently active one */
                                        const isThisActive = settings?.active_provider === p.id;
                                        // Determine if provider has valid configuration
                                        const hasConfig = settings?.keys_status?.[p.id] || (!p.needsKey);

                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setActiveTab(p.id)}
                                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all border group ${
                                                    activeTab === p.id 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25' 
                                                    : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg ${activeTab === p.id ? 'bg-white/20' : 'bg-gray-50 dark:bg-slate-800'} ${activeTab !== p.id ? p.color : 'text-white'}`}>
                                                        <p.icon size={18} />
                                                    </div>
                                                    {p.label}
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {/* Green check mark indicating provider is configured */}
                                                    {hasConfig && <Check size={14} className={activeTab === p.id ? 'text-blue-200' : 'text-green-500'} />}
                                                    
                                                    {/* Blue dot indicator showing this is the active provider */}
                                                    {isThisActive && (
                                                        <div className={`w-2 h-2 rounded-full ${activeTab === p.id ? 'bg-white' : 'bg-blue-600'} shadow-sm`} title="Active"></div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Form */}
                            <div className="w-2/3 space-y-6">
                                {/* Provider header with active status badge */}
                                <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 shadow-inner ${currentProviderDef?.color}`}>
                                            {currentProviderDef && <currentProviderDef.icon size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                                {currentProviderDef?.label}
                                            </h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Provider Configuration</p>
                                        </div>
                                    </div>
                                    
                                    {isSystemActive && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-500/30">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                            ACTIVE
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Model Name</label>
                                        <input 
                                            type="text" 
                                            value={modelName}
                                            onChange={(e) => setModelName(e.target.value)}
                                            placeholder={activeTab === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o'}
                                            className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none dark:text-white transition-all"
                                        />
                                    </div>

                                    {/* Conditionally render Base URL input only for Ollama local deployment */}
                                    {currentProviderDef?.id === 'ollama' && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Base URL</label>
                                            <input 
                                                type="text" 
                                                value={baseUrl}
                                                onChange={(e) => setBaseUrl(e.target.value)}
                                                placeholder="http://localhost:11434"
                                                className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none dark:text-white transition-all font-mono"
                                            />
                                        </div>
                                    )}

                                    {/* Conditionally render API Key input only for providers that require authentication */}
                                    {currentProviderDef?.needsKey && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">API Key</label>
                                            <div className="relative">
                                                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                {/* API Key password input with dynamic placeholder and saved state indicator */}
                                                <input 
                                                    type="password" 
                                                    value={apiKeyInput}
                                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                                    // Placeholder changes based on whether a key is already saved
                                                    placeholder={isKeySaved ? "••••••••••••••••" : "Enter API Key..."}
                                                    // Apply green border styling when a key is saved and user hasn't entered a new one
                                                    className={`w-full bg-gray-50 dark:bg-slate-800/50 border pl-12 pr-4 py-3 text-sm font-bold outline-none dark:text-white transition-all rounded-2xl ${
                                                        isKeySaved && !apiKeyInput 
                                                        ? 'border-green-200 dark:border-green-900/40 bg-green-50/20' 
                                                        : 'border-gray-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                                                    }`}
                                                />
                                                {/* Show "SAVED" indicator when a key exists and user hasn't entered a new one */}
                                                {isKeySaved && !apiKeyInput && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-200 dark:border-green-800/50">
                                                        <Check size={12} /> VERIFIED
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            Concurrency Limit
                                        </label>
                                        <input 
                                            type="number" 
                                            min={1}
                                            max={50}
                                            value={concurrencyLimit}
                                            onChange={(e) => setConcurrencyLimit(parseInt(e.target.value) || 1)}
                                            className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none dark:text-white transition-all"
                                        />
                                    </div>
                                    
                                    <div className="pt-2 flex justify-end">
                                        <button 
                                            onClick={handleSave}
                                            disabled={updateMutation.isPending}
                                            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-500/25 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-70 group"
                                        >
                                            {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:rotate-12 transition-transform" />}
                                            {isSystemActive ? "Update Settings" : "Save & Make Active"}
                                        </button>
                                    </div>
                                </div>

                                <TaskRoutingSection /> 
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};