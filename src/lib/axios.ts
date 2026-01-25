/**
 * @fileoverview Centralized Axios configuration for API communication.
 * 
 * This module creates a single, pre-configured Axios instance to be used
 * throughout the application for making HTTP requests to the Python backend.
 * It sets a base URL, default headers, and a global timeout. It also includes
 * an interceptor for centralized error logging.
 */
import axios from 'axios';

/**
 * The base URL for all API requests.
 * It is loaded from the Vite environment variable `VITE_API_URL` defined in the `.env` file.
 */
const API_URL = import.meta.env.VITE_API_URL as string;

/**
 * The pre-configured Axios client instance.
 * 
 * @property {string} baseURL - The base URL prepended to all requests.
 * @property {object} headers - Default headers for all requests.
 * @property {number} timeout - Default request timeout in milliseconds.
 */
export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 20000, // 20 seconds default timeout
});

/**
 * A global response interceptor to handle and log API errors centrally.
 * 
 * If a request is successful, it passes the response through.
 * If a request fails, it logs the error details to the console and
 * rejects the promise, allowing component-level error handling (e.g., in React Query).
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log a more informative error message to the console for easier debugging
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);