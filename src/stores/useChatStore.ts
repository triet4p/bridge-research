import { create } from 'zustand';
import { Paper, TocNode } from '../types/api';

interface ChatState {
    activePaper: Paper | null;
    isChatOpen: boolean;
    toc: TocNode[] | null; 
    
    openChat: (paper: Paper) => void;
    closeChat: () => void;
    setToc: (toc: TocNode[] | null) => void; 
}

export const useChatStore = create<ChatState>((set) => ({
    activePaper: null,
    isChatOpen: false,
    toc: null,

    openChat: (paper) => set({ activePaper: paper, isChatOpen: true, toc: null }),
    closeChat: () => set({ activePaper: null, isChatOpen: false, toc: null }),
    setToc: (toc) => set({ toc }),
}));