/**
 * @fileoverview
 * This file contains TypeScript interfaces that MUST match the
 * Pydantic DTOs defined in the Python backend.
 */


// --- CORE RESOURCES ---

/**
 * Represents a single paper, combining ArXiv metadata with local library status.
 */
export interface LocalPaper {
    /** The unique ArXiv ID (e.g., "2401.00001"). */
    paper_id: string;
    /** Title of the paper. */
    title: string;
    /** The paper's abstract. */
    summary: string;
    /** List of author names. */
    authors: string[];
    /** Publication date as an ISO 8601 string (UTC). */
    published: string;
    /** Direct link to the PDF on ArXiv. */
    pdf_link: string;
    /** Primary ArXiv category code (e.g., "cs.AI"). */
    category: string;
    
    /** True if the paper is saved in the local library. */
    is_saved?: boolean;
    /** Absolute path to the downloaded PDF file on the user's machine. */
    local_path?: string | null;
    /** Current reading status (used for future features). */
    read_status?: 'unread' | 'reading' | 'done';
}

/**
 * Defines the parameters for the ArXiv search API.
 */
export interface SearchFilters {
    /** Maximum number of results to fetch (1-100). */
    limit: number;
    /** Start date for the search range (YYYY-MM-DD). */
    startDate?: string;
    /** End date for the search range (YYYY-MM-DD). */
    endDate?: string;
    /** List of ArXiv category codes to include in the search. */
    categories: string[];
}

// --- ANALYSIS & RAG ---

/**
 * Represents a node in the hierarchical Table of Contents.
 */
export interface TocNode {
    /** Unique ID for the section (e.g., "sec_1"). */
    id: string;
    /** The title of the section. */
    title: string;
    /** Nesting level of the header. */
    level: number;
    /** A short text preview of the section's content. */
    preview: string;
    /** Array of child nodes for nested sections. */
    children: TocNode[];
}

/**
 * Represents the full structured result of a parsed paper PDF.
 */
export interface ParsedDocument {
    paper_id: string;
    /** The root nodes of the Table of Contents tree. */
    toc: TocNode[];
    /** A dictionary mapping section IDs to their full text content. */
    content_map: Record<string, string>;
}

/**
 * Response from the analysis status check endpoint.
 */
export interface AnalysisStatus {
    paper_id: string;
    /** True if the paper has been parsed and indexed in the local database. */
    is_analyzed: boolean;
}

/**
 * Payload for the AI summary generation request.
 */
export interface SummaryRequest {
    /** The text (usually the abstract) to be summarized. */
    text: string;
    /** The desired output language (e.g., "Vietnamese"). */
    language?: string;
}

/**
 * Response containing the AI-generated summary.
 */
export interface SummaryResponse {
    /** The summary text in Markdown format. */
    summary: string;
}

/**
 * Represents a single message in a chat conversation.
 */
export interface ChatMessage {
    /** The sender of the message. */
    role: 'user' | 'assistant';
    /** The text content of the message. */
    content: string;
}

/**
 * Payload for sending a message to the RAG chat engine.
 */
export interface ChatRequest {
    paper_id: string;
    /** URL of the PDF, used by the backend to auto-download if needed. */
    pdf_url: string; 
    /** The user's question. */
    message: string;
    /** The conversation history (optional, as backend now manages it). */
    history?: ChatMessage[];
}

/**
 * Response from the RAG chat engine.
 */
export interface ChatResponse {
    /** The AI-generated answer in Markdown. */
    answer: string;
    /** A list of section IDs that the AI used as context. */
    references: string[];
}


// --- SETTINGS ---

export enum LMTask {
    DEFAULT = "default",
    SUMMARY = "summary",
    CHAT = "chat",
    TREND = "trend",
    CODE = "code"
}

/**
 * DTO for retrieving the current AI configuration.
 */
export interface LMSettingResponse {
    /** The ID of the currently active provider (e.g., "gemini"). */
    active_provider: string;
    /** A map of public configurations for each provider (model name, base URL). */
    provider_configs: Record<string, Record<string, any>>;
    /** A map indicating whether an API key is saved for each provider. */
    keys_status: Record<string, boolean>;

    task_routing: Record<LMTask, string>;
}

/**
 * DTO for updating the AI configuration.
 */
export interface LMSettingUpdate {
    /** Set a new active provider. */
    active_provider?: string;
    /** A partial map of configurations to update or add. */
    config_update?: Record<string, Record<string, any>>;
    /** A map of API keys to save securely in the OS Keyring. */
    api_key_update?: Record<string, string>;
    /** A list of provider IDs whose keys should be deleted. */
    keys_to_delete?: string[];

    task_routing_update?: Record<string, string>;
}

export interface TrendPaperReference {
    /** Unique identifier of the referenced paper (ArXiv ID). */
    id: string;
    /** Title of the referenced paper. */
    title: string;
}

/**
 * Represents the complete result of a Trend Radar analysis session.
 *
 * This interface contains statistical aggregations, reference paper mappings,
 * and the AI-generated markdown report for AI research trends.
 */
export interface TrendAnalysis {
    /** Unique identifier of the analysis record. */
    id: number;
    /** Time window in days for the analysis (e.g., 7, 30). */
    time_window_days: number;
    /** Total number of papers analyzed. */
    paper_count: number;
    /** Distribution of papers by domain (e.g., { "NLP": 45, "CV": 30 }). */
    domain_distribution: Record<string, number>;
    /** Count of top techniques mentioned (e.g., { "LoRA": 15, "RAG": 12 }). */
    top_techniques: Record<string, number>;
    /** Reference papers grouped by domain for evidence-based citations. */
    domain_references: Record<string, TrendPaperReference[]>;
    /** Reference papers grouped by technique for evidence-based citations. */
    technique_references: Record<string, TrendPaperReference[]>;
    /** The full AI-generated report in Markdown format. */
    report_markdown: string;
    /** ISO 8601 timestamp when the analysis was created. */
    created_at: string;
}

/**
 * Request payload for generating a trend analysis report.
 *
 * This interface defines the parameters for customizing the trend analysis,
 * including time window, search filters, and paper limits.
 */
export interface TrendGenerateRequest {
    /** Time window in days for the analysis (1-30). */
    days: number;
    /** Optional keyword filter for paper search. */
    query?: string;
    /** List of ArXiv category codes to search (e.g., ["cs.AI", "cs.LG"]). */
    categories: string[];
    /** Maximum number of papers to analyze (10-500). */
    max_papers: number;
}

/**
 * Response for initiating an async trend generation task.
 *
 * This response contains a task ID that can be used to poll for progress updates.
 */
export interface TrendTaskResponse {
    /** Unique identifier for the background task. */
    task_id: string;
    /** Status message confirming task initiation. */
    message: string;
}

/**
 * Response for polling the status of an async trend generation task.
 *
 * This interface provides real-time progress updates during report generation,
 * including status, progress percentage, and the final result when complete.
 */
export interface TrendStatusResponse {
    /** Unique identifier for the background task. */
    task_id: string;
    /** Current task status. */
    status: 'pending' | 'processing' | 'completed' | 'failed';
    /** Progress percentage (0-100). */
    progress: number;
    /** Human-readable status message (e.g., "Fetching from ArXiv...", "Tagging 10/50..."). */
    message: string;
    /** The final analysis result when status is 'completed'. */
    result?: TrendAnalysis;
    /** Error message if status is 'failed'. */
    error?: string;
}
