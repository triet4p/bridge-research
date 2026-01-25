/**
 * @fileoverview Application-wide default values and constants.
 * 
 * This module centralizes default configurations for search, UI, and data handling
 * to ensure consistency and ease of maintenance.
 */

/**
 * A curated list of common ArXiv categories for Computer Science.
 * Used to populate the "Topics" filter dropdown.
 * 
 * @property {string} id - The official ArXiv category code.
 * @property {string} label - The human-readable name of the category.
 * @property {string} desc - A brief description of the category (in Vietnamese for i18n example).
 */
export const ARXIV_CATEGORIES = [
    { id: 'cs.AI', label: 'Artificial Intelligence', desc: 'General Artificial Intelligence' },
    { id: 'cs.LG', label: 'Machine Learning', desc: 'Machine Learning, Deep Learning' },
    { id: 'cs.CV', label: 'Computer Vision', desc: 'Computer Vision, Image Processing' },
    { id: 'cs.CL', label: 'Computation & Language', desc: 'NLP, Natural Language Processing' },
    { id: 'cs.RO', label: 'Robotics', desc: 'Robotics' },
    { id: 'cs.CR', label: 'Cryptography & Security', desc: 'Security and Cryptography' },
    { id: 'cs.SE', label: 'Software Engineering', desc: 'Software Engineering' },
    { id: 'cs.HC', label: 'Human-Computer Interaction', desc: 'Human-Computer Interaction' },
    { id: 'cs.MA', label: 'Multiagent Systems', desc: 'Multiagent Systems' },
    { id: 'stat.ML', label: 'Statistics Machine Learning', desc: 'Statistical Machine Learning' }
];

/**
 * The default number of search results to fetch per API call.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * An object containing functions to generate a default date range for searches.
 * Defaults to the last 7 days.
 */
export const DEFAULT_DATE_RANGE = {
    /**
     * @returns {string} The date 7 days ago in 'YYYY-MM-DD' format.
     */
    getStartDate: (): string => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    },
    /**
     * @returns {string} The current date in 'YYYY-MM-DD' format.
     */
    getEndDate: (): string => new Date().toISOString().split('T')[0]
};

// --- Helper Functions ---

/**
 * A utility function to get the human-readable label for a given category ID.
 * 
 * @param {string} id The ArXiv category code (e.g., 'cs.AI').
 * @returns {string} The full label (e.g., 'Artificial Intelligence') or the ID itself if not found.
 */
export const getCategoryLabel = (id: string): string => {
    const cat = ARXIV_CATEGORIES.find(c => c.id === id);
    return cat ? cat.label : id;
};

/**
 * A utility function to get the description for a given category ID.
 * 
 * @param {string} id The ArXiv category code.
 * @returns {string} The category description or an empty string if not found.
 */
export const getCategoryDesc = (id: string): string => {
    const cat = ARXIV_CATEGORIES.find(c => c.id === id);
    return cat ? cat.desc : "";
};