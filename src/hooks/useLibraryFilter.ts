// src/hooks/useLibraryFilter.ts
import { useMemo } from 'react';
import { Paper } from '../types/api';

export const useLibraryFilter = (papers: Paper[] | undefined, query: string) => {
    return useMemo(() => {
        if (!papers) return [];
        if (!query.trim()) return papers;

        const lowerQuery = query.toLowerCase().trim();
        
        return papers.filter(p => 
            p.title.toLowerCase().includes(lowerQuery) || 
            p.summary.toLowerCase().includes(lowerQuery) ||
            p.authors.some(a => a.toLowerCase().includes(lowerQuery)) ||
            p.category.toLowerCase().includes(lowerQuery)
        );
    }, [papers, query]);
};