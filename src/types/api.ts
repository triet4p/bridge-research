

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