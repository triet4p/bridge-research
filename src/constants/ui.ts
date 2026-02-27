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
 * - `trends`: The view for analyzing research trends based on saved papers.
 * - `repos`: The view for managing GitHub repositories linked to papers.
 * @type {'search' | 'library' | 'trends' | 'repos'}
 */
export type ViewMode = 'search' | 'library' | 'trends' | 'repos';