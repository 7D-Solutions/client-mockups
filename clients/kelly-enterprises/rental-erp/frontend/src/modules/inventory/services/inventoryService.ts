// Inventory service layer - API integration for inventory operations
// For Claude: Use apiClient instead of direct fetch() calls for all HTTP requests
import { apiClient } from '../../../infrastructure/api/client';
import type {
  InventoryLocation,
  InventoryMovement,
  MoveItemRequest,
  InventoryOverview,
  InventoryStatistics,
  LocationWithItems,
  ApiResponse
} from '../types';

export class InventoryService {

  /**
   * Move an item to a new location
   */
  async moveItem(request: MoveItemRequest): Promise<ApiResponse<{
    movementId: number;
    currentLocation: InventoryLocation;
    previousLocation: string | null;
  }>> {
    return apiClient.post<ApiResponse<any>>('/inventory/move', {
      itemType: request.itemType,
      itemIdentifier: request.itemIdentifier,
      toLocation: request.toLocation,
      reason: request.reason,
      notes: request.notes,
      quantity: request.quantity || 1,
      orderNumber: request.orderNumber,
      jobNumber: request.jobNumber
    });
  }

  /**
   * Get current location for an item
   */
  async getCurrentLocation(
    itemType: string,
    itemIdentifier: string
  ): Promise<ApiResponse<InventoryLocation | null>> {
    return apiClient.get<ApiResponse<InventoryLocation | null>>(
      `/inventory/location/${itemType}/${itemIdentifier}`
    );
  }

  /**
   * Remove item from inventory (when item is deleted)
   */
  async removeItem(
    itemType: string,
    itemIdentifier: string,
    reason?: string
  ): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(
      `/inventory/location/${itemType}/${itemIdentifier}`,
      { data: { reason } }
    );
  }

  /**
   * Get movement history for an item
   */
  async getMovementHistory(
    itemType: string,
    itemIdentifier: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<{
    movements: InventoryMovement[];
    total: number;
    limit: number;
    offset: number;
  }>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    return apiClient.get<ApiResponse<any>>(
      `/inventory/movements/${itemType}/${itemIdentifier}${queryString ? `?${queryString}` : ''}`
    );
  }

  // ==========================================
  // REPORTING ENDPOINTS
  // ==========================================

  /**
   * Get inventory dashboard overview
   */
  async getOverview(): Promise<ApiResponse<InventoryOverview>> {
    return apiClient.get<ApiResponse<InventoryOverview>>('/inventory/reports/overview');
  }

  /**
   * Get all items in a specific location
   */
  async getLocationDetails(locationCode: string): Promise<ApiResponse<LocationWithItems>> {
    return apiClient.get<ApiResponse<LocationWithItems>>(
      `/inventory/reports/by-location/${locationCode}`
    );
  }

  /**
   * Get movement history with optional filters
   */
  async getMovements(filters?: {
    itemType?: string;
    movementType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    movements: InventoryMovement[];
    total: number;
    limit: number;
    offset: number;
  }>> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.itemType) params.append('itemType', filters.itemType);
      if (filters.movementType) params.append('movementType', filters.movementType);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
    }

    const queryString = params.toString();
    return apiClient.get<ApiResponse<any>>(
      `/inventory/reports/movements${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get inventory statistics summary
   */
  async getStatistics(): Promise<ApiResponse<InventoryStatistics>> {
    return apiClient.get<ApiResponse<InventoryStatistics>>('/inventory/reports/statistics');
  }

  /**
   * Search inventory items
   */
  async searchInventory(
    searchType: 'all' | 'id' | 'name' | 'location',
    searchTerm: string
  ): Promise<ApiResponse<{
    results: Array<{
      item_type: string;
      item_identifier: string;
      current_location: string;
      quantity: number;
      item_name?: string;
    }>;
    total: number;
  }>> {
    return apiClient.get<ApiResponse<any>>(
      `/inventory/reports/search?type=${searchType}&term=${encodeURIComponent(searchTerm)}`
    );
  }
}

// Singleton instance
export const inventoryService = new InventoryService();
