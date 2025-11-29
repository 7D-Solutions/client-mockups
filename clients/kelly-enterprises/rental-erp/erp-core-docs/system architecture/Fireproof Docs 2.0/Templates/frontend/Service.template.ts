/**
 * SERVICE TEMPLATE
 *
 * This template provides a standardized API service layer for entity operations.
 *
 * PATTERN OVERVIEW:
 * - apiClient for all HTTP requests (handles auth, errors automatically)
 * - Typed request/response interfaces
 * - RESTful endpoint patterns
 * - Consistent error handling
 *
 * CUSTOMIZATION POINTS:
 * 1. Replace {{ENTITY_NAME}} with singular entity name (e.g., "Gauge", "User", "Order")
 * 2. Replace {{ENTITY_NAME_LOWER}} with lowercase singular (e.g., "gauge", "user", "order")
 * 3. Replace {{ENTITY_NAME_LOWER_PLURAL}} with lowercase plural (e.g., "gauges", "users", "orders")
 * 4. Replace {{API_PREFIX}} with API endpoint prefix (e.g., "/gauges", "/users", "/orders")
 * 5. Add entity-specific methods as needed
 *
 * API CLIENT BENEFITS:
 * - Automatic JWT authentication via Authorization header
 * - Automatic error handling and toast notifications
 * - Consistent response format { success, data, message, errors }
 * - Request/response logging in development mode
 *
 * IMPORTANT:
 * - NEVER use direct fetch() calls - always use apiClient
 * - All methods should be async and return Promises
 * - Use TypeScript interfaces for type safety
 *
 * @see gaugeService.ts - Reference implementation
 */

import { apiClient } from '../../../infrastructure/api/client';
import type {
  {{ENTITY_NAME}},
  {{ENTITY_NAME}}ListResponse,
  {{ENTITY_NAME}}CreateData,
  {{ENTITY_NAME}}UpdateData,
  {{ENTITY_NAME}}Filters,
  ApiResponse
} from '../types';

/**
 * Service class for {{ENTITY_NAME}} API operations
 * Singleton pattern - export single instance at bottom of file
 */
export class {{ENTITY_NAME}}Service {

  // ===== BASIC CRUD OPERATIONS =====

  /**
   * Get all {{ENTITY_NAME_LOWER_PLURAL}} with optional filters
   *
   * @param params - Optional filter parameters
   * @returns Promise<{{ENTITY_NAME}}ListResponse> - Paginated list of {{ENTITY_NAME_LOWER_PLURAL}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.getAll({ status: 'active', page: 1, limit: 50 });
   * const {{ENTITY_NAME_LOWER_PLURAL}} = response.data;
   */
  async getAll(params?: {{ENTITY_NAME}}Filters): Promise<{{ENTITY_NAME}}ListResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const url = `{{API_PREFIX}}${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<{{ENTITY_NAME}}ListResponse>(url);

    // Backend returns standardized format: { data: [...], pagination: {...} }
    return response;
  }

  /**
   * Get single {{ENTITY_NAME_LOWER}} by ID
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @returns Promise<{{ENTITY_NAME}}> - {{ENTITY_NAME}} entity
   *
   * @example
   * const {{ENTITY_NAME_LOWER}} = await {{ENTITY_NAME_LOWER}}Service.getById('123');
   */
  async getById(id: string): Promise<{{ENTITY_NAME}}> {
    const response = await apiClient.get<{ data: {{ENTITY_NAME}} }>(`{{API_PREFIX}}/${id}`);
    return response.data || response;
  }

  /**
   * Create new {{ENTITY_NAME_LOWER}}
   *
   * @param data - {{ENTITY_NAME}} creation data
   * @returns Promise<ApiResponse<{{ENTITY_NAME}}>> - Created {{ENTITY_NAME_LOWER}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.create({ name: 'New {{ENTITY_NAME}}', status: 'active' });
   * const new{{ENTITY_NAME}} = response.data;
   */
  async create(data: {{ENTITY_NAME}}CreateData): Promise<ApiResponse<{{ENTITY_NAME}}>> {
    return apiClient.post<ApiResponse<{{ENTITY_NAME}}>>('{{API_PREFIX}}', data);
  }

  /**
   * Update existing {{ENTITY_NAME_LOWER}}
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @param updates - Partial {{ENTITY_NAME_LOWER}} updates
   * @returns Promise<ApiResponse<{{ENTITY_NAME}}>> - Updated {{ENTITY_NAME_LOWER}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.update('123', { status: 'inactive' });
   * const updated{{ENTITY_NAME}} = response.data;
   */
  async update(id: string, updates: {{ENTITY_NAME}}UpdateData): Promise<ApiResponse<{{ENTITY_NAME}}>> {
    return apiClient.patch<ApiResponse<{{ENTITY_NAME}}>>(`{{API_PREFIX}}/${id}`, updates);
  }

  /**
   * Delete {{ENTITY_NAME_LOWER}}
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @returns Promise<ApiResponse<void>> - Deletion confirmation
   *
   * @example
   * await {{ENTITY_NAME_LOWER}}Service.delete('123');
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`{{API_PREFIX}}/${id}`);
  }

  // ===== CUSTOM OPERATIONS =====

  // CUSTOMIZATION POINT: Add entity-specific operations

  /**
   * Example: Approve a {{ENTITY_NAME_LOWER}}
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @param notes - Optional approval notes
   * @returns Promise<ApiResponse<{{ENTITY_NAME}}>> - Approved {{ENTITY_NAME_LOWER}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.approve('123', 'Approved by manager');
   */
  async approve(id: string, notes?: string): Promise<ApiResponse<{{ENTITY_NAME}}>> {
    return apiClient.post<ApiResponse<{{ENTITY_NAME}}>>(`{{API_PREFIX}}/${id}/approve`, { notes });
  }

  /**
   * Example: Reject a {{ENTITY_NAME_LOWER}}
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @param reason - Rejection reason
   * @returns Promise<ApiResponse<{{ENTITY_NAME}}>> - Rejected {{ENTITY_NAME_LOWER}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.reject('123', 'Does not meet requirements');
   */
  async reject(id: string, reason: string): Promise<ApiResponse<{{ENTITY_NAME}}>> {
    return apiClient.post<ApiResponse<{{ENTITY_NAME}}>>(`{{API_PREFIX}}/${id}/reject`, { reason });
  }

  /**
   * Example: Assign {{ENTITY_NAME_LOWER}} to user
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @param userId - User ID to assign to
   * @returns Promise<ApiResponse<{{ENTITY_NAME}}>> - Assigned {{ENTITY_NAME_LOWER}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.assign('123', '456');
   */
  async assign(id: string, userId: string): Promise<ApiResponse<{{ENTITY_NAME}}>> {
    return apiClient.post<ApiResponse<{{ENTITY_NAME}}>>(`{{API_PREFIX}}/${id}/assign`, { user_id: userId });
  }

  /**
   * Example: Bulk update {{ENTITY_NAME_LOWER_PLURAL}}
   *
   * @param ids - Array of {{ENTITY_NAME_LOWER}} IDs
   * @param updates - Updates to apply
   * @returns Promise<ApiResponse<{{ENTITY_NAME}}[]>> - Updated {{ENTITY_NAME_LOWER_PLURAL}}
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.bulkUpdate(['123', '456'], { status: 'archived' });
   */
  async bulkUpdate(ids: string[], updates: Partial<{{ENTITY_NAME}}>): Promise<ApiResponse<{{ENTITY_NAME}}[]>> {
    return apiClient.post<ApiResponse<{{ENTITY_NAME}}[]>>('{{API_PREFIX}}/bulk-update', { ids, updates });
  }

  /**
   * Example: Get {{ENTITY_NAME_LOWER}} history/audit trail
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @returns Promise<ApiResponse<any[]>> - History records
   *
   * @example
   * const response = await {{ENTITY_NAME_LOWER}}Service.getHistory('123');
   * const history = response.data;
   */
  async getHistory(id: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<ApiResponse<any[]>>(`{{API_PREFIX}}/${id}/history`);
  }

  /**
   * Example: Export {{ENTITY_NAME_LOWER_PLURAL}} to CSV
   *
   * @param filters - Optional filters
   * @returns Promise<Blob> - CSV file blob
   *
   * @example
   * const blob = await {{ENTITY_NAME_LOWER}}Service.exportToCSV({ status: 'active' });
   * const url = window.URL.createObjectURL(blob);
   * window.open(url);
   */
  async exportToCSV(filters?: {{ENTITY_NAME}}Filters): Promise<Blob> {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const url = `{{API_PREFIX}}/export${queryString ? `?${queryString}` : ''}`;

    // For file downloads, apiClient should return blob
    return apiClient.get<Blob>(url, { responseType: 'blob' });
  }

  /**
   * Example: Upload file/attachment for {{ENTITY_NAME_LOWER}}
   *
   * @param id - {{ENTITY_NAME}} identifier
   * @param formData - FormData with file
   * @returns Promise<ApiResponse<any>> - Upload result
   *
   * @example
   * const formData = new FormData();
   * formData.append('file', file);
   * const response = await {{ENTITY_NAME_LOWER}}Service.uploadFile('123', formData);
   */
  async uploadFile(id: string, formData: FormData): Promise<ApiResponse<any>> {
    // Don't manually set Content-Type for FormData - let browser set it with boundary
    return apiClient.post<ApiResponse<any>>(`{{API_PREFIX}}/${id}/upload`, formData);
  }

  // CUSTOMIZATION POINT: Add more domain-specific methods
  // Examples: search, validate, duplicate, archive, restore, etc.
}

/**
 * Singleton instance
 * Import this in your hooks and components
 *
 * @example
 * import { {{ENTITY_NAME_LOWER}}Service } from '../services';
 * const response = await {{ENTITY_NAME_LOWER}}Service.getAll();
 */
export const {{ENTITY_NAME_LOWER}}Service = new {{ENTITY_NAME}}Service();
