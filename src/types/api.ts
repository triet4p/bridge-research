

export interface Paper {
    paper_id: string; 
    title: string;
    summary: string;
    authors: string[];
    published: string; 
    pdf_link: string;
    category: string;
    
    is_downloaded?: boolean;
    local_path?: string | null;
    read_status?: 'unread' | 'reading' | 'done';
}

export interface SearchFilters {
    limit: number;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    categories: string[];
}

export interface LMSettingResponse {
    active_provider: string;
    provider_configs: Record<string, Record<string, any>>; // { "gemini": { "model": "..." } }
    keys_status: Record<string, boolean>; // { "gemini": true, "openrouter": false }
}

export interface LMSettingUpdate {
    active_provider?: string;
    config_update?: Record<string, Record<string, any>>;
    api_key_update?: Record<string, string>;
    keys_to_delete?: string[];
}

export interface SummaryRequest {
    text: string;
    language?: string; // "Vietnamese" | "English"
}

export interface SummaryResponse {
    summary: string;
}

export interface TocNode {
    id: string;
    title: string;
    level: number;
    preview: string;
    children: TocNode[];
}

export interface ParsedDocument {
    paper_id: string;
    toc: TocNode[];
    content_map: Record<string, string>;
}

export interface AnalysisStatus {
    paper_id: string;
    is_analyzed: boolean;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    paper_id: string;
    pdf_url: string; // Cần URL để backend download nếu chưa có
    message: string;
    history?: ChatMessage[];
}

export interface ChatResponse {
    answer: string;
    references: string[]; // List section_id
}