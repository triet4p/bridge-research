/**
 * @fileoverview Internationalization (i18n) dictionaries for the application.
 * 
 * This module centralizes all UI text strings for supported languages.
 * The structure allows for easy addition of new languages and ensures
 * that all user-facing text is managed in one place.
 * 
 * The `useAppStore` provides a convenient `t` accessor to get the dictionary
 * for the currently active language.
 */

/**
 * A type representing the structure of a single language's translation dictionary.
 * Ensures that all language objects have the same set of keys.
 */
type TranslationKeys = {
    searchPlaceholder: string;
    results: string;
    source: string;
    viewSummary: string;
    hideSummary: string;
    chatAnalyze: string;
    saved: string;
    retry: string;
    searchFailed: string;
    noResults: string;
    searching: string;
    settings: string;
    filters: string;
    fromDate: string;
    toDate: string;
    apply: string;
};

/**
 * A record containing the translation dictionaries for all supported languages.
 * The keys of this object are language codes (e.g., 'en', 'vi').
 * @type {Record<string, TranslationKeys>}
 */
export const TRANSLATIONS: Record<string, TranslationKeys> = {
    /**
     * English translations.
     */
    en: {
        searchPlaceholder: "Search papers (e.g., 'LLM Reasoning', 'YOLO v10')...",
        results: "Results",
        source: "Source",
        viewSummary: "View Abstract",
        hideSummary: "Hide Abstract",
        chatAnalyze: "Chat & Analyze",
        saved: "Saved",
        retry: "Retry Connection",
        searchFailed: "Search Failed",
        noResults: "No papers found. Try adjusting your keywords.",
        searching: "Searching ArXiv for",
        settings: "Settings",
        filters: "Filters",
        fromDate: "From",
        toDate: "To",
        apply: "Apply",
    },
    /**
     * Vietnamese translations.
     */
    vi: {
        searchPlaceholder: "Tìm kiếm bài báo (vd: 'LLM Reasoning', 'YOLO v10')...",
        results: "Kết quả",
        source: "Nguồn",
        viewSummary: "Xem tóm tắt",
        hideSummary: "Thu gọn",
        chatAnalyze: "Chat & Phân tích",
        saved: "Đã lưu",
        retry: "Thử lại kết nối",
        searchFailed: "Lỗi tìm kiếm",
        noResults: "Không tìm thấy bài báo nào. Hãy thử từ khóa khác.",
        searching: "Đang tìm kiếm ArXiv cho",
        settings: "Cài đặt",
        filters: "Bộ lọc",
        fromDate: "Từ ngày",
        toDate: "Đến ngày",
        apply: "Áp dụng",
    }
};