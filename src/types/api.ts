

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