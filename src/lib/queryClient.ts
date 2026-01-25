/**
 * @fileoverview Centralized configuration for TanStack Query (React Query).
 * 
 * This module creates and exports a single `QueryClient` instance with
 * default options for all queries in the application. This ensures
 * consistent caching behavior, refetching logic, and error handling.
 */
import { QueryClient } from '@tanstack/react-query';

/**
 * The global TanStack Query client instance.
 * 
 * @property {object} defaultOptions - Default settings applied to all `useQuery` hooks.
 * @property {number} defaultOptions.queries.staleTime - The duration in milliseconds that
 *           query data is considered "fresh" and will not be refetched automatically.
 *           Set to 5 minutes to reduce unnecessary API calls for data that doesn't change often.
 * @property {number} defaultOptions.queries.gcTime - "Garbage Collection Time". The duration
 *           in milliseconds that inactive query data is kept in the cache before being
 *           discarded. Set to 30 minutes.
 * @property {number | boolean} defaultOptions.queries.retry - The number of times a failed query
 *           will be automatically retried. Set to 1 to handle transient network errors.
 * @property {boolean} defaultOptions.queries.refetchOnWindowFocus - If set to false, queries
 *           will not automatically refetch when the application window gains focus. This is
 *           disabled to prevent unnecessary API calls in a desktop app context.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 1 minutes.
            staleTime: 1000 * 60 * 1, 
            
            // Inactive queries are garbage collected after 5 minutes.
            gcTime: 1000 * 60 * 5,
            
            // Retry failed queries once by default.
            retry: 1,
            
            // Disable automatic refetching when the app window gains focus.
            refetchOnWindowFocus: false,
        },
    },
});