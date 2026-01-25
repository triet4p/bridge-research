/**
 * @fileoverview Zustand store for managing the global state of the Chat Modal.
 * 
 * This store handles which paper is currently active in the chat, whether the
 * modal is visible, and caches the Table of Contents (ToC) for the active paper.
 */

import { create } from 'zustand';
import { LocalPaper, TocNode } from '../types/api';

/**
 * Defines the shape of the Chat Store's state and actions.
 */
interface ChatState {
    /** The paper object currently being discussed in the chat modal. Null if closed. */
    activePaper: LocalPaper | null;
    /** Controls the visibility of the chat modal. */
    isChatOpen: boolean;
    /** 
     * The cached Table of Contents tree for the active paper.
     * This is populated after a successful analysis.
     */
    toc: TocNode[] | null; 
    
    /**
     * Action to open the chat modal for a specific paper.
     * @param paper The paper to open the chat for.
     */
    openChat: (paper: LocalPaper) => void;
    /**
     * Action to close the chat modal and clear the active state.
     */
    closeChat: () => void;
    /**
     * Action to update the Table of Contents in the store.
     * @param toc The new ToC tree, or null to clear it.
     */
    setToc: (toc: TocNode[] | null) => void; 
}

/**
 * Creates the Zustand store for chat state management.
 */
export const useChatStore = create<ChatState>((set) => ({
    activePaper: null,
    isChatOpen: false,
    toc: null,

    openChat: (paper) => set({ activePaper: paper, isChatOpen: true, toc: null }),
    closeChat: () => set({ activePaper: null, isChatOpen: false, toc: null }),
    setToc: (toc) => set({ toc }),
}));