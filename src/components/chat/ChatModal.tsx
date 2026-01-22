import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Bot, User, FileText, Loader2, BrainCircuit, BookOpen, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../../stores/useChatStore';
import { useAnalysisStatus, useAnalyzePaper, useDeleteAnalysis, useReloadToc } from '../../hooks/usePaperAnalysis'; // Import hook mới
import { usePaperChat, useChatHistory } from '../../hooks/usePaperChat';
import { ChatMessage } from '../../types/api';
import { TocItem } from './TocItem'; // Import Sub-component
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const ChatModal: React.FC = () => {
    const { isChatOpen, activePaper, closeChat, toc, setToc } = useChatStore();
    
    // Hooks
    const { data: status, isLoading: checkingStatus } = useAnalysisStatus(activePaper?.paper_id || '', isChatOpen);
    
    // --- FIX: Load History từ Backend ---
    const { data: serverHistory, isLoading: loadingHistory } = useChatHistory(
        activePaper?.paper_id || '', 
        isChatOpen && !!status?.is_analyzed // Chỉ load khi đã analyze xong
    );

    const analyzeMutation = useAnalyzePaper();
    const chatMutation = usePaperChat();
    const deleteAnalysisMutation = useDeleteAnalysis();
    const reloadTocMutation = useReloadToc(); // Hook reload

    // Local State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Reset UI khi mở modal
    useEffect(() => {
        if (serverHistory) {
            if (serverHistory.length > 0) {
                setMessages(serverHistory);
            } else {
                // Nếu history rỗng -> Hiện lời chào mặc định (nhưng không lưu vào DB)
                setMessages([{ role: 'assistant', content: `Hello! I'm ready to discuss "${activePaper?.title}".` }]);
            }
        }
    }, [serverHistory, activePaper]);

    // Logic Load ToC nếu thiếu (Dùng Hook thay vì gọi trực tiếp)
    useEffect(() => {
        // Thêm điều kiện: Không reload nếu vừa mới xóa xong
        const justDeleted = deleteAnalysisMutation.isSuccess;
        
        if (
            isChatOpen && 
            activePaper && 
            status?.is_analyzed && 
            !toc && 
            !reloadTocMutation.isPending &&
            !justDeleted // <--- FIX QUAN TRỌNG
        ) {
            reloadTocMutation.mutate(
                { paperId: activePaper.paper_id, pdfUrl: activePaper.pdf_link },
                { onSuccess: (data) => setToc(data) }
            );
        }
    }, [
        isChatOpen, 
        activePaper, 
        status?.is_analyzed, 
        toc, 
        deleteAnalysisMutation.isSuccess // Thêm vào deps
    ]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatMutation.isPending]);

    // Update ToC khi analyze xong
    useEffect(() => {
        if (analyzeMutation.isSuccess && analyzeMutation.data) {
            setToc(analyzeMutation.data.toc);
        }
    }, [analyzeMutation.isSuccess, analyzeMutation.data]);

    const handleAnalyze = () => {
        if (!activePaper) return;
        analyzeMutation.mutate({ 
            paperId: activePaper.paper_id, 
            pdfUrl: activePaper.pdf_link 
        });
    };

    const handleDeleteAnalysis = () => {
        if (!activePaper) return;
        if (confirm("Are you sure? This will delete the local PDF and cached structure.")) {
            deleteAnalysisMutation.mutate(activePaper.paper_id, {
                onSuccess: () => {
                    setToc(null);
                    // Reset messages để tránh người dùng chat tiếp với ngữ cảnh cũ
                    setMessages([]);
                }
            });
        }
    };

    const handleSendMessage = () => {
        if (!activePaper || !input.trim() || chatMutation.isPending) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        // Optimistic Update: Hiện ngay tin nhắn user
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        chatMutation.mutate(
            {
                paper_id: activePaper.paper_id,
                pdf_url: activePaper.pdf_link,
                message: userMsg.content,
                // --- FIX: Không cần gửi history lên nữa, Backend tự lấy từ DB ---
            },
            {
                onSuccess: (data) => {
                    const botMsg: ChatMessage = { role: 'assistant', content: data.answer };
                    setMessages(prev => [...prev, botMsg]);
                },
                onError: (err) => {
                    // Rollback hoặc hiện lỗi
                    const errorMsg: ChatMessage = { role: 'assistant', content: `❌ Error: ${(err as any).response?.data?.detail || "Chat failed."}` };
                    setMessages(prev => [...prev, errorMsg]);
                }
            }
        );
    };

    if (!isChatOpen || !activePaper) return null;

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex overflow-hidden">
                
                {/* LEFT SIDEBAR */}
                <div className="w-1/4 min-w-[250px] bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <FileText size={18} className="text-blue-500" /> Paper Structure
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2">
                        {checkingStatus || reloadTocMutation.isPending ? ( 
                            // Case 1: Đang check status HOẶC đang load lại ToC
                            <div className="space-y-2 p-2 animate-pulse">
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
                            </div>
                        ) : !status?.is_analyzed && !analyzeMutation.isSuccess ? (
                            // Case 2: Chưa analyze
                            <div className="p-4 text-center text-gray-500 text-sm">
                                <BookOpen size={40} className="mx-auto mb-2 opacity-50" />
                                <p>Analyze the paper to view its structure and enable deep chat.</p>
                            </div>
                        ) : toc ? (
                            // Case 3: Đã có ToC -> Render cây
                            <div className="space-y-1">
                                {toc.map(node => <TocItem key={node.id} node={node} />)}
                            </div>
                        ) : (
                            // Case 4: Đã analyze nhưng chưa có ToC (Hiếm gặp nếu logic trên đúng)
                            // Có thể hiện nút Retry load ToC ở đây nếu cần
                            <div className="text-xs text-gray-400 p-2 italic">Structure data missing.</div>
                        )}
                    </div>

                    {/* Footer Sidebar (Nút Xóa) */}
                    {(status?.is_analyzed || analyzeMutation.isSuccess) && (
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

                {/* RIGHT MAIN */}
                <div className="flex-1 flex flex-col relative">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                        <div className="flex-1 truncate pr-4">
                            <h2 className="font-bold text-gray-800 dark:text-white truncate">{activePaper.title}</h2>
                            <p className="text-xs text-gray-500">{activePaper.authors.join(', ')}</p>
                        </div>
                        <button onClick={closeChat} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
                        {checkingStatus ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Loader2 size={40} className="animate-spin mb-2" />
                                <p>Checking analysis status...</p>
                            </div>
                        ) : !status?.is_analyzed && !analyzeMutation.isSuccess && !analyzeMutation.isPending ? (
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
                        ) : analyzeMutation.isPending ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <Loader2 size={50} className="animate-spin text-blue-500" />
                                <div className="text-center">
                                    <h3 className="font-bold text-lg">Reading Paper...</h3>
                                    <p className="text-sm text-gray-500">Downloading PDF & Parsing Structure</p>
                                </div>
                            </div>
                        ) : loadingHistory ? ( // <-- Thêm điều kiện này
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                <Loader2 size={30} className="animate-spin" />
                                <p>Loading conversation...</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                            </div>
                                            <div className={`p-4 rounded-2xl shadow-sm ${
                                                msg.role === 'user' 
                                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-slate-700'
                                            }`}>
                                                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={{
                                                            // Custom style cho table
                                                            table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-lg"><table className="w-full text-sm text-left" {...props} /></div>,
                                                            th: ({node, ...props}) => <th className="bg-gray-100 dark:bg-slate-800 px-4 py-2 font-bold border-b dark:border-gray-700" {...props} />,
                                                            td: ({node, ...props}) => <td className="px-4 py-2 border-b dark:border-gray-700 last:border-0" {...props} />,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

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
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    {!checkingStatus && (status?.is_analyzed || analyzeMutation.isSuccess) && (
                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ask about this paper..."
                                    disabled={chatMutation.isPending}
                                    className="w-full bg-gray-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-xl pl-4 pr-12 py-3 text-sm outline-none dark:text-white transition-all disabled:opacity-50"
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || chatMutation.isPending}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all active:scale-95"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};