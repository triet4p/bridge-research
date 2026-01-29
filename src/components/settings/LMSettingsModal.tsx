// src/components/settings/LMSettingsModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { X, Save, Check, Key, Server, Cpu, Loader2, BrainCircuit, Info } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLMSettings } from '../../hooks/useLMSettings';
import { LMSettingUpdate, LMTask } from '../../types/api';

/**
 * Configuration object for available AI/LM provider options.
 * Each provider object contains metadata about the service including its identifier,
 * display label, icon component, and whether an API key is required for authentication.
 * 
 * @type {Array<{id: string, label: string, icon: React.ComponentType, needsKey: boolean}>}
 */
const PROVIDERS = [
    { id: 'gemini', label: 'Google Gemini', icon: Cpu, needsKey: true },
    { id: 'openrouter', label: 'OpenRouter', icon: Server, needsKey: true },
    { id: 'ollama', label: 'Ollama (Local)', icon: Server, needsKey: false },
    { id: 'openai', label: 'OpenAI', icon: Cpu, needsKey: true },
];

/**
 * Task Specific Routing Section
 * Allows users to assign specific models to specific tasks.
 * Logic: Only providers with a saved API key and a configured model name are selectable.
 */
const TaskRoutingSection = () => {
    const { data: settings, updateMutation } = useLMSettings();
    const { language } = useAppStore();

    if (!settings) return null;

    /**
     * Filter providers that are actually ready to be used.
     * A provider is ready if:
     * 1. It has a saved key (or is Ollama).
     * 2. It has a model name configured in provider_configs.
     */
    const readyProviders = PROVIDERS.filter(p => {
        const hasKey = settings.keys_status[p.id];
        const hasModel = !!settings.provider_configs[p.id]?.model;
        return hasKey && hasModel;
    });

    const TASK_LABELS: Record<LMTask, string> = {
        [LMTask.DEFAULT]: language === 'vi' ? "Mặc định hệ thống" : "Global Default",
        [LMTask.SUMMARY]: language === 'vi' ? "Tóm tắt nhanh" : "Quick Summary",
        [LMTask.CHAT]: language === 'vi' ? "Chat nghiên cứu sâu" : "Deep Research Chat",
        [LMTask.TREND]: language === 'vi' ? "Phân tích xu hướng" : "Trend Radar Analysis",
        [LMTask.CODE]: language === 'vi' ? "Phân tích mã nguồn" : "Code Inspector",
    };

    return (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <BrainCircuit size={16} className="text-purple-500" /> 
                    {language === 'vi' ? "Điều hướng Model chuyên biệt" : "Task Specific Routing"}
                </h4>
                
                {/* Visual cue if no providers are ready */}
                {readyProviders.length === 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-100 dark:border-amber-900/30">
                        <Info size={12} />
                        {language === 'vi' ? "Cần cấu hình Model/Key trước" : "Configure Model/Key first"}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3">
                {Object.values(LMTask).map((taskId) => (
                    <div 
                        key={taskId} 
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-all"
                    >
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {TASK_LABELS[taskId]}
                            </span>
                            <span className="text-[10px] text-gray-400">ID: {taskId}</span>
                        </div>

                        <select 
                            value={settings.task_routing[taskId] || ""}
                            onChange={(e) => {
                                updateMutation.mutate({
                                    task_routing_update: { [taskId]: e.target.value }
                                });
                            }}
                            className="text-xs font-medium bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {/* Option to inherit from active_provider */}
                            <option value="">
                                {language === 'vi' ? "-- Dùng mặc định --" : "-- Use Default --"}
                            </option>
                            
                            {/* Only show providers that are actually configured */}
                            {readyProviders.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.label} ({settings.provider_configs[p.id]?.model})
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            
            <p className="mt-4 text-[10px] text-gray-400 italic">
                * {language === 'vi' 
                    ? "Chỉ các Provider đã lưu Key và nhập tên Model mới xuất hiện trong danh sách." 
                    : "Only providers with saved keys and model names will appear in this list."}
            </p>
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
                    // Include base_url only if it has a value (for optional fields like Ollama)
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
                        <div className="flex gap-6">
                            {/* Sidebar List */}
                            <div className="w-1/3 space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-2">Providers</label>
                                {/* Render provider list buttons */}
                                {PROVIDERS.map(p => {
                                    /** Check if this provider is the currently active one */
                                    const isThisActive = settings?.active_provider === p.id;
                                    // Determine if provider has valid configuration
                                    // Ollama is always considered configured since it doesn't require API key
                                    const hasConfig = settings?.keys_status?.[p.id] || (!p.needsKey);

                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setActiveTab(p.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all border ${
                                                activeTab === p.id 
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' 
                                                : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <p.icon size={16} />
                                                {p.label}
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                {/* Green check mark indicating provider is configured */}
                                                {hasConfig && <Check size={14} className="text-green-500" />}
                                                
                                                {/* Blue dot indicator showing this is the active provider */}
                                                {isThisActive && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" title="Active"></div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Main Form */}
                            <div className="w-2/3 space-y-5">
                                {/* Provider header with active status badge */}
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        {currentProviderDef?.label}
                                        {/* Show "ACTIVE" badge if this provider is currently active */}
                                        {isSystemActive && (
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full border border-blue-200 dark:border-blue-800">
                                                ACTIVE
                                            </span>
                                        )}
                                    </h4>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model Name</label>
                                    <input 
                                        type="text" 
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        placeholder={activeTab === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o'}
                                        className="w-full bg-gray-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none dark:text-white transition-all"
                                    />
                                </div>

                                {/* Conditionally render Base URL input only for Ollama local deployment */}
                                {currentProviderDef?.id === 'ollama' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base URL</label>
                                        <input 
                                            type="text" 
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder="http://localhost:11434"
                                            className="w-full bg-gray-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none dark:text-white transition-all"
                                        />
                                    </div>
                                )}

                                {/* Conditionally render API Key input only for providers that require authentication */}
                                {currentProviderDef?.needsKey && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                                        <div className="relative">
                                            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            {/* API Key password input with dynamic placeholder and saved state indicator */}
                                            <input 
                                                type="password" 
                                                value={apiKeyInput}
                                                onChange={(e) => setApiKeyInput(e.target.value)}
                                                // Placeholder changes based on whether a key is already saved
                                                placeholder={isKeySaved ? "•••••••••••••••• (Key saved)" : "Enter new API Key..."}
                                                // Apply green border styling when a key is saved and user hasn't entered a new one
                                                className={`w-full bg-gray-100 dark:bg-slate-800 border focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none dark:text-white transition-all ${
                                                    isKeySaved && !apiKeyInput ? 'border-green-200 dark:border-green-900/50' : 'border-transparent'
                                                }`}
                                            />
                                            {/* Show "SAVED" indicator when a key exists and user hasn't entered a new one */}
                                            {isKeySaved && !apiKeyInput && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                                                    <Check size={10} /> SAVED
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end">
                                    <button 
                                        onClick={handleSave}
                                        disabled={updateMutation.isPending}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                                    >
                                        {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {isSystemActive ? "Update Configuration" : "Save & Activate"}
                                    </button>
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