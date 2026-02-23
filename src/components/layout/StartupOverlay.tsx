import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Cpu, Globe, Database, AlertCircle, Sparkles } from 'lucide-react';
import logoImg from '../../assets/logo.png';

const LOADING_MESSAGES = [
    "Waking up the AI Brain...",
    "Connecting to local knowledge base...",
    "Preparing ArXiv Bridge...",
    "Initializing Neural Engines...",
    "Optimizing Research Radar...",
];

interface Props {
    canEnter: boolean;
}

export const StartupOverlay: React.FC<Props> = ({ canEnter }) => {
    const { connectionError } = useAppStore();
    const [messageIndex, setMessageIndex] = useState(0);
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        if (canEnter) return;
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [canEnter]);

    useEffect(() => {
        if (canEnter) {
            const timer = setTimeout(() => setShouldRender(false), 1100);
            return () => clearTimeout(timer);
        }
    }, [canEnter]);

    if (!shouldRender) return null;

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-all duration-1000 ease-in-out ${
            canEnter ? 'opacity-0 pointer-events-none scale-110' : 'opacity-100'
        }`}>
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden opacity-10 dark:opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="relative flex flex-col items-center max-w-sm w-full px-8">
                <div className="mb-8 relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl animate-bounce duration-[2000ms]">
                        <img 
                            src={logoImg} 
                            alt="Bridge Research Logo" 
                            className="w-12 h-12 object-contain" 
                        />
                    </div>
                    <div className="absolute -top-2 -right-2">
                        <Sparkles className="text-yellow-400 animate-pulse" size={24} />
                    </div>
                </div>

                <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white mb-2 uppercase">Bridge Research</h1>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-12">AI Intelligence Suite</p>

                {connectionError ? (
                    <div className="w-full p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl animate-in zoom-in-95">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
                            <AlertCircle size={24} /><span className="font-bold text-sm">Connection Failed</span>
                        </div>
                        <p className="text-xs text-red-500 dark:text-red-300 mb-6 leading-relaxed text-center">{connectionError}</p>
                        <button onClick={() => window.location.reload()} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-lg shadow-red-600/20">RESTART ENGINE</button>
                    </div>
                ) : (
                    <div className="w-full space-y-6">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4 h-6">
                                <span className="text-sm font-bold italic animate-pulse">{LOADING_MESSAGES[messageIndex]}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700 shadow-inner">
                                <div className="h-full bg-blue-600 w-1/3 rounded-full animate-infinite-scroll"></div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-6 opacity-30">
                            <Cpu size={18} className="animate-pulse" />
                            <Globe size={18} className="animate-pulse delay-75" />
                            <Database size={18} className="animate-pulse delay-150" />
                        </div>
                    </div>
                )}
            </div>
            <div className="absolute bottom-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">v0.2.0 • Phase 2 Stable</div>
        </div>
    );
};