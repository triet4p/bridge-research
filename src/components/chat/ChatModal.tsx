import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Bot, User, FileText, Loader2, BrainCircuit, BookOpen, Sparkles, Trash2, MessageSquare, Code2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import { useChatStore } from '../../stores/useChatStore';
import { useAnalysisStatus, useAnalyzeWithSave, useDeleteAnalysis, useToc } from '../../hooks/usePaperAnalysis';
import { usePaperChat, useChatHistory } from '../../hooks/usePaperChat';
import { ChatMessage } from '../../types/api';
import { TocItem } from './TocItem';
import { ImplementationTab } from './ImplementationTab';

/**
 * ChatModal component for interactive paper analysis and discussion.
 * 
 * This modal provides a comprehensive interface for:
 * - Triggering PDF analysis and content indexing
 * - Viewing paper structure (table of contents) in a sidebar
 * - Conducting multi-turn conversations about paper content
 * - Managing analysis state and chat history
 * 
 * The component manages a complex state machine with multiple phases:
 * 1. Check analysis status on paper load
 * 2. Trigger PDF analysis if needed
 * 3. Load chat history and document structure when analysis is complete
 * 4. Enable chat interface for paper discussion
 * 
 * All data fetching is conditional based on paper selection and analysis status
 * to minimize unnecessary API calls.
 * 
 * @component
 * @returns {React.ReactElement|null} The rendered chat modal or null if closed
 */
export const ChatModal: React.FC = () => {
    // ===== Store & Local State =====
    const { isChatOpen, activePaper, closeChat, toc, setToc } = useChatStore();
    const [activeTab, setActiveTab] = useState<'chat' | 'implementation'>('chat');
    /** Chat message history (user and assistant messages) */
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    /** Current user input text before sending */
    const [input, setInput] = useState('');
    /** Ref for auto-scrolling chat to latest message */
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ===== API Queries & Mutations =====
    const paperId = activePaper?.paper_id || '';
    // Only fetch when modal is open and paper is selected
    const shouldFetch = isChatOpen && !!paperId;

    // Query: Check if paper has been analyzed
    const { data: status, isLoading: checkingStatus } = useAnalysisStatus(paperId, isChatOpen);
    const isAnalyzed = !!status?.is_analyzed;

    // Query: Load chat history and ToC only after analysis is complete
    const { data: serverHistory, isLoading: loadingHistory } = useChatHistory(paperId, shouldFetch && isAnalyzed);
    const { data: queryToc, isLoading: loadingToc } = useToc(paperId, shouldFetch && isAnalyzed);

    // Mutation: Analyze paper and save to backend
    const { trigger: analyzeWithSave, isPending: isAnalyzing, isSuccess: isAnalyzeSuccess, reset: resetAnalyzeState } = useAnalyzeWithSave();
    // Mutation: Send chat message to AI
    const chatMutation = usePaperChat();
    // Mutation: Delete analysis and related data
    const deleteAnalysisMutation = useDeleteAnalysis();

    // ===== Effect: Reset modal state when switching papers =====
    /**
     * Clear local state when opening/closing modal or switching papers.
     * Ensures clean slate when viewing a new paper to avoid:
     * - Ghost messages from previous paper
     * - Stale mutation state suggesting recent analysis
     * - Pre-filled search input
     */
    useEffect(() => {
        if (isChatOpen && activePaper) {
            setMessages([]); // Clear old messages
            resetAnalyzeState(); // Reset analyze mutation state
            setInput(''); // Clear input field
        }
    }, [isChatOpen, activePaper?.paper_id]);

    // ===== Effect: Synchronize chat history from server =====
    /**
     * Load chat history when paper analysis is complete.
     * - If server returns messages, display them
     * - If server returns empty and no local messages, show welcome greeting
     * - Prevents displaying old messages during loading
     */
    useEffect(() => {
        if (serverHistory && serverHistory.length > 0) {
            setMessages(serverHistory);
        } else if (isChatOpen && activePaper && messages.length === 0 && !loadingHistory) {
            // Show welcome message when starting fresh chat
            setMessages([{ role: 'assistant', content: `Hello! I'm ready to discuss "${activePaper.title}".` }]);
        }
    }, [serverHistory, isChatOpen, activePaper, loadingHistory]);

    // ===== Effect: Synchronize table of contents from server =====
    /**
     * Update ToC when fetched from server.
     * ToC is only fetched after analysis is complete.
     * Persists to store for use in sidebar display.
     */
    useEffect(() => {
        if (queryToc) setToc(queryToc);
    }, [queryToc, setToc]);

    // ===== Effect: Trigger ToC refresh after analysis completes =====
    /**
     * After successful analysis, the useToc hook will automatically
     * refetch data due to query invalidation in the useAnalyzeWithSave hook.
     * This effect is a placeholder for potential additional logic on analysis completion.
     */
    useEffect(() => {
        if (isAnalyzeSuccess) {
            // useToc will automatically refetch via invalidateQueries
        }
    }, [isAnalyzeSuccess]);

    // ===== Effect: Auto-scroll to latest message =====
    /**
     * Scroll chat area to show the latest message whenever:
     * - New messages are added
     * - Bot is typing (chatMutation.isPending)
     * Provides smooth scrolling behavior for better UX.
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatMutation.isPending]);


    // ===== Event Handlers =====
    /**
     * Handler: Trigger paper PDF analysis and content indexing.
     * 
     * Initiates the analysis process which:
     * - Downloads the PDF from provided link
     * - Extracts document structure (table of contents)
     * - Indexes content for fast retrieval during chat
     * 
     * The operation runs asynchronously with progress feedback via UI states.
     */
    const handleAnalyze = () => {
        if (activePaper) analyzeWithSave(activePaper);
    };

    /**
     * Handler: Delete analysis data for the current paper.
     * 
     * Removes:
     * - Locally downloaded PDF
     * - Cached document structure
     * - All chat history
     * 
     * Requires user confirmation before deletion.
     * Clears UI state and allows re-analysis from scratch.
     */
    const handleDeleteAnalysis = () => {
        if (!activePaper) return;
        if (confirm("Are you sure? This will delete the local PDF, cached structure, and chat history.")) {
            deleteAnalysisMutation.mutate(activePaper.paper_id, {
                onSuccess: () => {
                    setToc(null);
                    setMessages([]);
                    resetAnalyzeState();
                }
            });
        }
    };

    /**
     * Handler: Submit user message and request AI response.
     * 
     * Flow:
     * 1. Validates paper is selected and input is not empty
     * 2. Adds user message to chat history immediately
     * 3. Clears input field for next message
     * 4. Sends message to backend AI
     * 5. On success, appends AI response to chat
     * 6. On error, displays error message in chat
     * 
     * Prevents duplicate submissions via isPending flag.
     */
    const handleSendMessage = () => {
        if (!activePaper || !input.trim() || chatMutation.isPending) return;

        // Add user message to chat immediately for responsive UI
        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Send to backend AI
        chatMutation.mutate(
            {
                paper_id: activePaper.paper_id,
                pdf_url: activePaper.pdf_link,
                message: userMsg.content,
            },
            {
                onSuccess: (data) => {
                    const botMsg: ChatMessage = { role: 'assistant', content: data.answer };
                    setMessages(prev => [...prev, botMsg]);
                },
                onError: (err) => {
                    const errorMsg: ChatMessage = { role: 'assistant', content: `❌ Error: ${(err as any).response?.data?.detail || "Chat failed."}` };
                    setMessages(prev => [...prev, errorMsg]);
                }
            }
        );
    };

    useEffect(() => {
        if (isChatOpen) setActiveTab('chat');
    }, [isChatOpen, activePaper?.paper_id]);

    // ===== Render Guard =====
    // Return null if modal is not open to unmount component
    if (!isChatOpen || !activePaper) return null;

    // ===== Derived State: UI Display Logic =====
    /**
     * Determine when to show the full chat interface.
     * Shows when:
     * - Paper has been analyzed (backend status check), OR
     * - Analysis just completed (mutation success flag)
     */
    const showChatInterface = isAnalyzed || isAnalyzeSuccess;

    // ===== RENDER =====
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex overflow-hidden">
                
                {/* ===== LEFT SIDEBAR: Paper Structure (ToC) ===== */}
                <div className="w-1/4 min-w-[250px] bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col">
                    {/* Sidebar header */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <FileText size={18} className="text-blue-500" /> Paper Structure
                        </h3>
                    </div>
                    
                    {/* ToC content area - scrollable */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {/* State 1: Loading ToC */}
                        {checkingStatus || loadingToc || isAnalyzing ? ( 
                            <div className="space-y-2 p-2 animate-pulse">
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
                            </div>
                        ) : !showChatInterface ? (
                            /* State 2: Not analyzed yet - show empty state */
                            <div className="p-4 text-center text-gray-500 text-sm">
                                <BookOpen size={40} className="mx-auto mb-2 opacity-50" />
                                <p>Analyze the paper to view its structure and enable deep chat.</p>
                            </div>
                        ) : (toc || queryToc) ? (
                            /* State 3: ToC loaded - render recursive tree */
                            <div className="space-y-1">
                                {(toc || queryToc || []).map(node => <TocItem key={node.id} node={node} />)}
                            </div>
                        ) : (
                            /* State 4: Analyzed but no ToC - error state */
                            <div className="text-xs text-gray-400 p-2 italic">Structure data missing.</div>
                        )}
                    </div>

                    {/* Delete analysis data button - appears after successful analysis */}
                    {showChatInterface && (
                        <div className="p-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                            <button 
                                onClick={handleDeleteAnalysis}
                                disabled={deleteAnalysisMutation.isPending}
                                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-all"
                            >
                                {deleteAnalysisMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Clear Analysis Data
                            </button>
                        </div>
                    )}
                </div>

                {/* ===== RIGHT SECTION: Chat Interface ===== */}
                <div className="flex-1 flex flex-col relative min-w-0">
                    {/* Modal header with paper title and close button */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                        <div className="flex-1 truncate pr-4">
                            <h2 className="font-bold text-gray-800 dark:text-white truncate">{activePaper.title}</h2>
                            <p className="text-xs text-gray-500">{activePaper.authors.join(', ')}</p>
                        </div>
                        {/* Tab Switcher */}
                        {showChatInterface && !isAnalyzing && (
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-4">
                                <button 
                                    onClick={() => setActiveTab('chat')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <MessageSquare size={14} /> Chat
                                </button>
                                <button 
                                    onClick={() => setActiveTab('implementation')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'implementation' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Code2 size={14} /> Code
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={closeChat} 
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            title="Close Chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Conditional Rendering based on Tab */}
                    <div className="flex-1 min-h-0">
                        {activeTab === 'chat' ? (
                            <div className="h-full flex flex-col">
                                {/* Chat content area - manages multiple UI states */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
                                    
                                    {/* State 1: Checking analysis status */}
                                    {checkingStatus ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <Loader2 size={40} className="animate-spin mb-2" />
                                            <p>Checking analysis status...</p>
                                        </div>
                                    ) : !showChatInterface && !isAnalyzing ? (
                                        /* State 2: Paper not analyzed yet - show call-to-action */
                                        <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-80">
                                            <BrainCircuit size={80} className="text-blue-500 animate-pulse" />
                                            <div className="text-center max-w-md">
                                                <h3 className="text-xl font-bold mb-2">Deep Analysis Required</h3>
                                                <p className="text-gray-500 mb-6">
                                                    To chat with this paper, I need to download the PDF, read its structure, and index the content. This happens locally.
                                                </p>
                                                <button 
                                                    onClick={handleAnalyze}
                                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 mx-auto transition-all active:scale-95"
                                                >
                                                    <Sparkles size={20} /> Start Analysis
                                                </button>
                                            </div>
                                        </div>
                                    ) : isAnalyzing ? (
                                        /* State 3: Analysis in progress - show loading state */
                                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                                            <Loader2 size={50} className="animate-spin text-blue-500" />
                                            <div className="text-center">
                                                <h3 className="font-bold text-lg">Reading Paper...</h3>
                                                <p className="text-sm text-gray-500">Downloading PDF & Parsing Structure</p>
                                            </div>
                                        </div>
                                    ) : loadingHistory ? (
                                        /* State 4: Loading chat history - show spinner */
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                            <Loader2 size={30} className="animate-spin" />
                                            <p>Loading conversation...</p>
                                        </div>
                                    ) : (
                                        /* State 5: Chat interface ready - render messages */
                                        <>
                                            {/* Render all messages in conversation history */}
                                            {messages.map((msg, idx) => (
                                                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        {/* Message avatar icon */}
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                                        </div>
                                                        
                                                        {/* Message bubble with content and styling */}
                                                        <div className={`p-4 rounded-2xl shadow-sm overflow-hidden ${
                                                            msg.role === 'user' 
                                                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-slate-700'
                                                        }`}>
                                                            {/* Render markdown content with math and table support */}
                                                            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                                                                <ReactMarkdown 
                                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                                    rehypePlugins={[rehypeKatex]}
                                                                    components={{
                                                                        table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-lg max-w-full block"><table className="w-full text-sm text-left" {...props} /></div>,
                                                                        th: ({node, ...props}) => <th className="bg-gray-100 dark:bg-slate-800 px-4 py-2 font-bold border-b dark:border-gray-700 whitespace-nowrap" {...props} />,
                                                                        td: ({node, ...props}) => <td className="px-4 py-2 border-b dark:border-gray-700 last:border-0 min-w-[100px]" {...props} />,
                                                                    }}
                                                                >
                                                                    {msg.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Bot typing indicator shown while awaiting response */}
                                            {chatMutation.isPending && (
                                                <div className="flex justify-start w-full">
                                                    <div className="flex max-w-[80%] gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                                                            <Bot size={16} />
                                                        </div>
                                                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                                                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Reading & Reasoning...
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Invisible element for auto-scroll reference */}
                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                </div>

                                {/* ===== Chat Input Area ===== */}
                                {/* Only visible when analysis is complete and chat interface is ready */}
                                {!checkingStatus && showChatInterface && !isAnalyzing && (
                                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
                                        <div className="relative">
                                            {/* Message input field with keyboard support */}
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder="Ask about this paper..."
                                                disabled={chatMutation.isPending}
                                                className="w-full bg-gray-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-xl pl-4 pr-12 py-3 text-sm outline-none dark:text-white transition-all disabled:opacity-50"
                                            />
                                            {/* Send button - disabled when input is empty or response is pending */}
                                            <button 
                                                onClick={handleSendMessage}
                                                disabled={!input.trim() || chatMutation.isPending}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all active:scale-95"
                                                title="Send Message"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ImplementationTab paper={activePaper} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};