/**
 * @fileoverview UI-related constants and type definitions.
 * 
 * This module centralizes types and constants that define the state
 * and behavior of the user interface, separate from API data types.
 */

/**
 * Defines the possible main views or tabs within the application.
 * - `search`: The view for discovering new papers from ArXiv.
 * - `library`: The view for browsing papers saved in the local database.
 * @type {'search' | 'library' | 'trends'}
 */
export type ViewMode = 'search' | 'library' | 'trends';