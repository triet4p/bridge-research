/**
 * @fileoverview Utility functions for interacting with system-level features.
 */
import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Opens a URL in the user's default system browser.
 * 
 * This function provides a safe way to open external links from the Tauri app.
 * It uses the `@tauri-apps/plugin-opener` which invokes the OS's default handler
 * for the URL scheme (e.g., opening Chrome for `https://`).
 * 
 * It includes a fallback to `window.open` for compatibility when running in a
 * standard web browser during development (outside of the Tauri context).
 *
 * @param {string} url The URL to open. If the URL is empty or null, the function does nothing.
 * @returns {Promise<void>} A promise that resolves when the open command is sent.
 */
export const openExternal = async (url: string): Promise<void> => {
    if (!url) return;
    
    // Debug log to trace which URL is being opened.
    console.log("Opening URL:", url);

    try {
        // Attempt to use the native Tauri opener plugin.
        // This is the preferred method as it uses the system's default browser.
        await openUrl(url);
    } catch (error) {
        // This catch block handles cases where the Tauri API is not available
        // (e.g., running `npm run dev` in a regular browser).
        console.warn("Tauri opener failed, falling back to window.open:", error);
        
        // Fallback to the standard web API for opening a new tab.
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};