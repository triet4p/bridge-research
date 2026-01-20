// src/components/settings/LMSettingsModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { X, Save, Check, Key, Server, Cpu, Loader2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLMSettings } from '../../hooks/useLMSettings';
import { LMSettingUpdate } from '../../types/api';

const PROVIDERS = [
    { id: 'gemini', label: 'Google Gemini', icon: Cpu, needsKey: true },
    { id: 'openrouter', label: 'OpenRouter', icon: Server, needsKey: true },
    { id: 'ollama', label: 'Ollama (Local)', icon: Server, needsKey: false },
    { id: 'openai', label: 'OpenAI', icon: Cpu, needsKey: true },
];

export const LMSettingsModal: React.FC = () => {
    const { isSettingsOpen, closeSettings } = useAppStore();
    const { data: settings, isLoading, updateMutation } = useLMSettings();
    
    // Local state
    const [activeTab, setActiveTab] = useState<string>('gemini');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [modelName, setModelName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    
    // Ref để track việc đã sync data lần đầu chưa
    const hasSyncedRef = useRef(false);

    // Reset ref khi đóng modal
    useEffect(() => {
        if (!isSettingsOpen) {
            hasSyncedRef.current = false;
            setApiKeyInput('');
        } else {
            hasSyncedRef.current = false;
        }
    }, [isSettingsOpen]);

    // --- FIX 1: Sync Active Provider đúng cách ---
    useEffect(() => {
        if (settings && isSettingsOpen && !hasSyncedRef.current) {
            // Nếu backend có active provider, nhảy tab sang đó
            if (settings.active_provider) {
                setActiveTab(settings.active_provider);
            }
            hasSyncedRef.current = true;
        }
    }, [settings, isSettingsOpen]);

    // --- FIX 2: Sync Form Data khi đổi Tab ---
    useEffect(() => {
        if (settings && activeTab) {
            // Lấy config từ backend, nếu không có thì fallback về rỗng
            const config = settings.provider_configs[activeTab] || {};
            setModelName(config.model || '');
            setBaseUrl(config.base_url || '');
            setApiKeyInput(''); 
        }
    }, [settings, activeTab]);

    const handleSave = () => {
        const payload: LMSettingUpdate = {
            active_provider: activeTab, // Save là kích hoạt luôn tab này
            config_update: {
                [activeTab]: {
                    model: modelName,
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
                // Force sync lại để UI cập nhật trạng thái Active ngay lập tức
                hasSyncedRef.current = false; 
            }
        });
    };

    if (!isSettingsOpen) return null;

    const currentProviderDef = PROVIDERS.find(p => p.id === activeTab);
    // Check key status an toàn hơn
    const isKeySaved = settings?.keys_status?.[activeTab] || false;
    const isSystemActive = settings?.active_provider === activeTab;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden">
                
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
                <div className="p-6 flex-1 overflow-y-auto">
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
                                {PROVIDERS.map(p => {
                                    const isThisActive = settings?.active_provider === p.id;
                                    // Ollama luôn coi là có key (config)
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
                                                {/* Dấu tích xanh nếu đã có key */}
                                                {hasConfig && <Check size={14} className="text-green-500" />}
                                                
                                                {/* Dấu chấm Active */}
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
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        {currentProviderDef?.label}
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

                                {currentProviderDef?.needsKey && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                                        <div className="relative">
                                            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                type="password" 
                                                value={apiKeyInput}
                                                onChange={(e) => setApiKeyInput(e.target.value)}
                                                // --- FIX: Logic placeholder ---
                                                placeholder={isKeySaved ? "•••••••••••••••• (Key saved)" : "Enter new API Key..."}
                                                className={`w-full bg-gray-100 dark:bg-slate-800 border focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none dark:text-white transition-all ${
                                                    isKeySaved && !apiKeyInput ? 'border-green-200 dark:border-green-900/50' : 'border-transparent'
                                                }`}
                                            />
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};