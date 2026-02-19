/**
 * Application Entry Point
 * 
 * Initializes the React application with:
 * - Strict Mode for development warnings
 * - React Query provider for server state management and caching
 * - Global styles (Tailwind CSS)
 * 
 * The QueryClientProvider wraps the entire App to enable all hooks like useQuery,
 * useMutation, and useInfiniteQuery throughout the component tree.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Global styles including Tailwind CSS utility classes

// ===== React Query Setup =====
// Provides caching, synchronization, and server state management for API calls
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { attachConsole } from "@tauri-apps/plugin-log";

// Chạy ngay khi app khởi động để bắt log từ backend (Rust/Python)
attachConsole().catch(console.error);

/**
 * Render the application into the DOM
 * 
 * Steps:
 * 1. Find the root HTML element
 * 2. Wrap App with QueryClientProvider for server state management
 * 3. Use React.StrictMode for highlighting potential issues in development
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);