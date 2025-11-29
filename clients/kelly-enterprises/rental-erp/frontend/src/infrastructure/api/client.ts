// Centralized API client for all modules
//
// MANDATORY: Use this apiClient for ALL HTTP requests in the application.
// DO NOT use direct fetch() calls - they bypass:
// - Automatic authentication (httpOnly cookies)
// - Consistent error handling and 401 redirects
// - Request/response interceptors
//
// For Claude Code: ALWAYS import { apiClient } from this file instead of using fetch().
import { getApiUrl } from '../utils/env';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class APIClient {
  private baseURL = `${getApiUrl()}/api`;

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = options.body instanceof FormData;
    const headers = isFormData
      ? { ...options.headers } // No Content-Type for FormData
      : {
          'Content-Type': 'application/json',
          ...options.headers,
        };

    const response = await fetch(`${this.baseURL}${path}`, {
      credentials: 'include', // Always include httpOnly cookies
      headers,
      ...options,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({
          message: 'Session expired. Please login again.',
          status: response.status
        }));
        
        // Only trigger logout for authentication-related 401s, not business logic 401s
        const isAuthenticationError = errorData.error?.includes('token') || 
                                     errorData.error?.includes('session') || 
                                     errorData.error?.includes('Authentication required') ||
                                     errorData.error?.includes('Session expired') ||
                                     errorData.message?.includes('Session expired');
        
        if (isAuthenticationError) {
          // Dispatch logout event only for actual authentication failures
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { reason: 'Session expired or invalid' } 
          }));
        }
        
        throw new APIError(errorData.error || errorData.message || 'Unauthorized', response.status, errorData);
      }
      
      const errorData = await response.json().catch(() => ({
        message: response.statusText || 'Request failed',
        status: response.status
      }));
      // Use errorData.message if available, otherwise the whole object as message
      const message = errorData.message || errorData.error || JSON.stringify(errorData);
      throw new APIError(message, response.status, errorData);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  }

  // Convenience methods
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    // Don't JSON.stringify FormData - it needs to be sent as-is
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body,
    });
  }

  async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  async patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const apiClient = new APIClient();