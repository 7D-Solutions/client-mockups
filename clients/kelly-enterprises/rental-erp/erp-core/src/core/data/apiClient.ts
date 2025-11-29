import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { AUTH_TOKEN_KEY, clearAuth } from '../auth/index.js';

/**
 * Configuration options for creating an API client
 */
export interface ApiClientConfig {
  baseURL?: string;
  withCredentials?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  navigationAuth?: {
    authError: (clearAuthFn: () => void) => void;
  };
}

/**
 * Default configuration for the API client
 */
const DEFAULT_CONFIG: Required<Omit<ApiClientConfig, 'navigationAuth'>> = {
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
};

/**
 * Creates a configured axios instance with authentication and retry logic
 */
export function createApiClient(config: ApiClientConfig = {}): AxiosInstance {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Create axios instance with base configuration
  const client = axios.create({
    baseURL: finalConfig.baseURL,
    withCredentials: finalConfig.withCredentials,
    timeout: finalConfig.timeout,
  });

  // Configure retry logic
  axiosRetry(client, {
    retries: finalConfig.retries,
    retryDelay: (retryCount) => {
      return retryCount * finalConfig.retryDelay;
    },
    retryCondition: (error: AxiosError) => {
      // Retry on network errors and 5xx status codes, but not on 4xx (except 429)
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             (error.response?.status ? error.response.status >= 500 || error.response.status === 429 : false);
    },
  });

  // Add request interceptor to attach auth token if available
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle 401 errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Use NavigationAuth to handle auth error if provided
        if (config.navigationAuth) {
          config.navigationAuth.authError(clearAuth);
        } else {
          // Fallback to just clearing auth if no navigation provided
          clearAuth();
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Default API client instance with standard configuration
 */
export const apiClient = createApiClient();

/**
 * Export the default instance as default export for backward compatibility
 */
export default apiClient;