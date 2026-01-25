/**
 * @fileoverview Utility functions for formatting and rendering text content.
 * This module provides functions to enhance plain text with interactive elements,
 * such as clickable links.
 */


import { openExternal } from './openLink';
import { JSX } from 'react';

/**
 * Parses a string of text, finds all URLs, and wraps them in clickable `<span>` elements.
 * 
 * This function uses a regular expression to detect URLs and styles them differently
 * based on the domain (e.g., GitHub, Hugging Face). It also handles trailing punctuation
 * to ensure the correct URL is opened.
 *
 * @param {string} text The raw text content (e.g., a paper abstract).
 * @returns {JSX.Element[] | null} An array of React elements and strings, 
 *          ready to be rendered, or null if the input text is empty.
 */
export const formatAbstract = (text: string): JSX.Element[] | null => {
    if (!text) return null;

    // Regex Explanation:
    // https?:\/\/      -> Starts with http:// or https://
    // [^\s]+           -> Greedily matches all non-whitespace characters
    // [^.,;)\s]        -> The LAST character MUST NOT be a period, comma, semicolon,
    //                     closing parenthesis, or whitespace. This prevents including
    //                     trailing punctuation in the URL.
    const urlRegex = /(https?:\/\/[^\s]+[^.,;)\s])/g;

    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            let className = "font-medium hover:underline cursor-pointer transition-colors ";
            if (part.includes("github.com")) {
                className += "text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 px-1 rounded";
            } else if (part.includes("huggingface.co")) {
                className += "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded";
            } else {
                className += "text-blue-600 dark:text-blue-400";
            }

            return (
                <span 
                    key={index} 
                    onClick={(e) => {
                        e.stopPropagation();
                        openExternal(part);
                    }}
                    className={className}
                    title={`Open: ${part}`}
                >
                    {part}
                </span>
            );
        }
        return <span key={index}>{part}</span>;
    });
};