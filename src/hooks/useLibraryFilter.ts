import { useMemo } from 'react';
import { LocalPaper } from '../types/api';

/**
 * Custom React hook for filtering papers in the library based on a search query.
 * 
 * This hook uses `useMemo` to optimize performance by memoizing the filtered results,
 * ensuring the filter operation only runs when the papers array or query string changes.
 * 
 * @param {LocalPaper[] | undefined} papers - The array of papers to filter, or undefined if not yet loaded
 * @param {string} query - The search query string to filter papers by
 * @returns {LocalPaper[]} - An array of papers matching the search query
 * 
 * @example
 * const filteredPapers = useLibraryFilter(papers, searchQuery);
 */
export const useLibraryFilter = (papers: LocalPaper[] | undefined, query: string) => {
    return useMemo(() => {
        // Return empty array if papers data is not available yet
        if (!papers) return [];
        
        // Return all papers if the search query is empty or only whitespace
        if (!query.trim()) return papers;

        // Normalize query string to lowercase and trim whitespace for consistent comparison
        const lowerQuery = query.toLowerCase().trim();
        
        // Filter papers by matching the query against multiple fields
        return papers.filter(p => 
            p.title.toLowerCase().includes(lowerQuery) || 
            p.summary.toLowerCase().includes(lowerQuery) ||
            p.authors.some(a => a.toLowerCase().includes(lowerQuery)) ||
            p.category.toLowerCase().includes(lowerQuery)
        );
    }, [papers, query]);
};