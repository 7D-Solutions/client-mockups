// Gauge service layer - API integration for gauge operations
// For Claude: Use apiClient instead of direct fetch() calls for all HTTP requests
// This provides automatic authentication, error handling, and consistent patterns
import { apiClient } from '../../../infrastructure/api/client';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import type { 
  Gauge, 
  GaugeListResponse, 
  CheckoutData, 
  ReturnData, 
  TransferData,
  UnsealRequest,
  CalibrationRecord,
  ApiResponse 
} from '../types';

export class GaugeService {
  
  // Get all gauges with filters
  async getAll(params?: {
    status?: string;
    category?: string;
    storage_location?: string;
    search?: string;
    visibility?: 'all' | 'complete';
    equipment_type?: string;
    page?: number;
    limit?: number;
  }): Promise<GaugeListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = searchParams.toString();
    const url = `/gauges${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<GaugeListResponse>(url);
    
    // The backend returns the standardized format: { data: [...], pagination: {...} }
    // which matches our GaugeListResponse interface
    return response;
  }

  // Get single gauge by ID
  async getById(id: string): Promise<Gauge> {
    const response = await apiClient.get<{ data: Gauge }>(`/gauges/${id}`);
    return response.data || response;
  }

  // Get gauge set by set ID
  async getSetById(setId: string): Promise<{ goGauge: Gauge; nogoGauge: Gauge; set_id: string; status: string; created_at: string }> {
    const response = await apiClient.get<{
      data: {
        goGauge: Gauge;
        nogoGauge: Gauge;
        set_id: string;
        status: string;
        created_at: string;
      }
    }>(`/gauges/v2/sets/${setId}`);
    return response.data;
  }

  // Checkout operations
  async checkout(id: string, data: CheckoutData): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/${id}/checkout`, data);
  }

  // Return operations  
  async return(id: string, data: ReturnData): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/${id}/return`, data);
  }

  // Accept return operation
  async acceptReturn(id: string, data: { returned_to_storage_location?: string }): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/${id}/accept-return`, data);
  }

  // QC Verify operation
  async verifyQC(id: string, data: { 
    pass_fail: 'pass' | 'fail'; 
    condition_rating: number; 
    notes?: string; 
    requires_calibration: boolean 
  }): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/${id}/qc-verify`, data);
  }

  // Transfer operations
  async transfer(id: string, data: TransferData): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/tracking/transfers`, {
      gauge_id: id,
      to_user_id: parseInt(data.to_user_id as any), // Ensure it's sent as integer
      reason: data.reason
    });
  }

  async cancelTransfer(transferId: string | number, reason: string = 'Transfer cancelled by user'): Promise<ApiResponse<any>> {
    return apiClient.put<ApiResponse<any>>(`/gauges/tracking/transfers/${transferId}/reject`, { reason });
  }

  // Phase 3: Connect orphaned transfer endpoints
  async getTransfers(params?: { status?: string; user_type?: string }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.user_type) searchParams.append('user_type', params.user_type);
    const queryString = searchParams.toString();
    return apiClient.get<ApiResponse<any>>(`/gauges/tracking/transfers${queryString ? `?${queryString}` : ''}`);
  }

  async acceptTransfer(transferId: string | number): Promise<ApiResponse<any>> {
    return apiClient.put<ApiResponse<any>>(`/gauges/tracking/transfers/${transferId}/accept`);
  }

  // Unseal request operations
  async createUnsealRequest(gaugeId: string, reason: string): Promise<ApiResponse<UnsealRequest>> {
    return apiClient.post<ApiResponse<UnsealRequest>>(`/gauges/tracking/${gaugeId}/unseal-request`, {
      reason
    });
  }

  async approveUnsealRequest(requestId: string): Promise<ApiResponse<UnsealRequest>> {
    return apiClient.post<ApiResponse<UnsealRequest>>(`/gauges/tracking/unseal-requests/${requestId}/approve`);
  }

  async denyUnsealRequest(requestId: string, reason: string): Promise<ApiResponse<UnsealRequest>> {
    return apiClient.post<ApiResponse<UnsealRequest>>(`/gauges/tracking/unseal-requests/${requestId}/deny`, { reason });
  }

  async confirmUnseal(requestId: string): Promise<ApiResponse<any>> {
    return apiClient.put<ApiResponse<any>>(`/gauges/tracking/unseal-requests/${requestId}/confirm-unseal`);
  }

  async approveSetUnsealRequests(setId: string): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>(`/gauges/tracking/unseal-requests/set/${setId}/approve`);
  }

  async denySetUnsealRequests(setId: string, reason: string): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>(`/gauges/tracking/unseal-requests/set/${setId}/deny`, { reason });
  }

  // Calibration operations
  async sendToCalibration(gaugeIds: string[]): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>('/gauges/calibrations/send', { gauge_ids: gaugeIds });
  }

  async receiveFromCalibration(data: {
    gauge_id: string;
    passed: boolean;
    certificate_no?: string;
    document_path?: string;
    notes?: string;
    performed_at: string;
  }): Promise<ApiResponse<CalibrationRecord>> {
    return apiClient.post<ApiResponse<CalibrationRecord>>('/gauges/calibrations/receive', data);
  }

  // Recovery operations (admin only)
  async resetGauge(gaugeId: string, reason: string): Promise<ApiResponse<Gauge>> {
    return apiClient.post<ApiResponse<Gauge>>(`/gauges/recovery/${gaugeId}/reset`, { reason });
  }

  // Get gauge history/audit trail
  async getGaugeHistory(gaugeId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<ApiResponse<any[]>>(`/gauges/tracking/${gaugeId}/history`);
  }

  // Get pending QC items
  async getPendingQC(): Promise<ApiResponse<Gauge[]>> {
    const response = await apiClient.get<ApiResponse<Gauge[]>>('/gauges/tracking/qc/pending');
    // Trust backend to provide consistent data format
    return response;
  }

  // Get unseal requests
  async getUnsealRequests(status?: string): Promise<ApiResponse<UnsealRequest[]>> {
    const url = status ? `/gauges/tracking/unseal-requests?status=${status}` : '/gauges/tracking/unseal-requests';
    return apiClient.get<ApiResponse<UnsealRequest[]>>(url);
  }

  // Get all gauges from tracking endpoint with filtering support
  async getAllFromTracking(params?: {
    status?: string;
    equipment_type?: string;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<Gauge[]>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = searchParams.toString();
    const url = `/gauges/tracking${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<ApiResponse<Gauge[]>>(url);
    // Trust backend to provide consistent data format
    return response;
  }

  // Get my gauges counts
  async getMyGaugesCounts(): Promise<ApiResponse<{
    checkedOut: number;
    personal: number;
    transfers: number;
  }>> {
    return apiClient.get<ApiResponse<{
      checkedOut: number;
      personal: number;
      transfers: number;
    }>>('/gauges/my-gauges/counts');
  }

  // Get category counts
  async getCategoryCounts(): Promise<ApiResponse<{
    thread: number;
    company: number;
    employee: number;
    large: number;
    total: number;
  }>> {
    return apiClient.get<ApiResponse<{
      thread: number;
      company: number;
      employee: number;
      large: number;
      total: number;
    }>>('/gauges/category-counts');
  }

  // Update a single gauge
  async updateGauge(gaugeId: string, updates: Partial<Gauge>): Promise<ApiResponse<Gauge>> {
    return apiClient.patch<ApiResponse<Gauge>>(`/gauges/${gaugeId}`, updates);
  }

  // Bulk operations
  async bulkSendToCalibration(gaugeIds: string[]): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>('/gauges/calibrations/bulk-send', { gauge_ids: gaugeIds });
  }

  // New methods for gauge creation workflow
  async getCategoriesByEquipmentType(equipmentType: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<ApiResponse<any[]>>(`/gauges/v2/categories/${equipmentType}`);
  }

  async createGaugeSet(goData: any, noGoData: any): Promise<ApiResponse<{
    go: Gauge;
    noGo: Gauge;
  }>> {
    // Now we properly send both thread_type and thread_form
    const mapThreadData = (data: any) => ({
      ...data,
      // thread_type is already the category (standard, metric, etc.)
      // thread_form is already the specific form (UN, UNF, etc.)
      name: data.name || `${data.thread_size} ${data.thread_form || data.thread_type} ${data.thread_class}`
    });

    const payload = {
      goGauge: mapThreadData(goData),
      noGoGauge: mapThreadData(noGoData)
    };

    const result = await apiClient.post<ApiResponse<{ go: Gauge; noGo: Gauge }>>('/gauges/v2/create-set', payload);
    return result;
  }

  async createGauge(gaugeData: any): Promise<ApiResponse<Gauge>> {
    // Now we properly send both thread_type and thread_form
    const mappedData = {
      ...gaugeData,
      // thread_type is already the category (standard, metric, etc.)
      // thread_form is already the specific form (UN, UNF, etc.)
      name: gaugeData.name || (EquipmentRules.isThreadGauge(gaugeData)
        ? `${gaugeData.thread_size} ${gaugeData.thread_form || gaugeData.thread_type} ${gaugeData.thread_class}`
        : gaugeData.name)
    };

    const result = await apiClient.post<ApiResponse<Gauge>>('/gauges/v2/create', mappedData);
    return result;
  }

  async getSpares(filters?: {
    equipment_type?: string;
    category?: string;
    storage_location?: string;
  }): Promise<ApiResponse<Gauge[]>> {
    const searchParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const url = `/gauges/v2/spares${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<Gauge[]>>(url);
    // Trust backend to provide consistent data format
    return response;
  }

  // Certificate upload
  async uploadCertificate(gaugeId: string, formData: FormData): Promise<ApiResponse<{
    gaugeId: string;
    gaugeName: string;
    fileName: string;
    dropboxPath: string;
    sharedLink?: string;
    fileSize: number;
    uploadedAt: string;
    uploadedBy: string;
  }>> {
    // Don't manually set Content-Type for FormData - let browser set it with boundary
    return apiClient.post<ApiResponse<any>>(`/gauges/${gaugeId}/upload-certificate`, formData);
  }

  // Get certificate info
  async getCertificate(gaugeId: string): Promise<ApiResponse<{
    hasCertificate: boolean;
    gaugeId?: string;
    gaugeName?: string;
    documentPath?: string;
    metadata?: {
      fileName: string;
      fileSize: number;
      modifiedAt: string;
    };
  }>> {
    return apiClient.get<ApiResponse<any>>(`/gauges/${gaugeId}/certificate`);
  }

  // ==========================================
  // PHASE 0: SET RELATIONSHIP OPERATIONS
  // ==========================================

  /**
   * Unpair a gauge set
   * @param gaugeId - Numeric ID of one gauge in the set
   * @param reason - Reason for unpairing (optional)
   */
  async unpairSet(gaugeId: number | string, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/v2/unpair`, {
      gaugeId: typeof gaugeId === 'string' ? parseInt(gaugeId, 10) : gaugeId,
      reason
    });
  }

  /**
   * Replace a gauge in a set
   * @param oldGaugeId - ID of gauge to replace
   * @param newGaugeId - ID of replacement gauge
   * @param reason - Reason for replacement
   */
  async replaceGauge(
    oldGaugeId: string,
    newGaugeId: string,
    reason: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/v2/replace-companion`, {
      existingGaugeId: oldGaugeId,
      newCompanionId: newGaugeId,
      reason
    });
  }

  /**
   * Pair two spare gauges into a set
   * @param goGaugeId - ID of the GO gauge
   * @param nogoGaugeId - ID of the NOGO gauge
   * @param storageLocation - Storage location for the set
   * @param setId - Optional custom set ID (auto-generated if not provided)
   */
  async pairSpares(
    goGaugeId: number,
    nogoGaugeId: number,
    storageLocation: string,
    setId?: string
  ): Promise<ApiResponse<{ setId: string }>> {
    return apiClient.post('/gauges/v2/pair-spares', {
      goGaugeId,
      noGoGaugeId: nogoGaugeId,  // Map parameter name to backend field name
      storageLocation,
      ...(setId && { setId })  // Only include if provided
    });
  }

  /**
   * Get spare gauges with optional filters
   * @param filters - Optional filters for spare gauges
   */
  async getSpareGauges(filters?: {
    threadSize?: string;
    threadClass?: string;
    gaugeType?: 'GO' | 'NOGO';
    equipmentType?: string;
    categoryId?: number;
  }): Promise<Gauge[]> {
    const params = new URLSearchParams();
    if (filters?.equipmentType) params.append('equipment_type', filters.equipmentType);
    if (filters?.categoryId) params.append('category_id', filters.categoryId.toString());
    if (filters?.threadSize) params.append('thread_size', filters.threadSize);
    if (filters?.threadClass) params.append('thread_class', filters.threadClass);
    if (filters?.gaugeType) params.append('gauge_type', filters.gaugeType);

    const response = await apiClient.get<{ success: boolean; data: Gauge[]; count: number }>(`/gauges/v2/spares?${params}`);
    return response.data || [];
  }

  /**
   * Get the companion gauge for a given gauge using set_id
   * @param gaugeId - ID of the gauge
   * @returns Companion gauge or null if none
   */
  async getCompanionGauge(gaugeId: number): Promise<Gauge | null> {
    const gauge = await this.getById(gaugeId.toString());
    if (!gauge.set_id) return null;

    // Determine companion gauge_id from set_id and suffix
    // GO gauge (A suffix) → NO GO gauge (B suffix) and vice versa
    if (gauge.gauge_id) {
      const suffix = gauge.gauge_id.slice(-1);
      if (suffix === 'A' || suffix === 'B') {
        const companionSuffix = suffix === 'A' ? 'B' : 'A';
        const companionGaugeId = gauge.set_id + companionSuffix;
        try {
          return await this.getById(companionGaugeId);
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  // ==========================================
  // PHASE 0: CALIBRATION WORKFLOW OPERATIONS
  // ==========================================

  /**
   * Release a gauge from calibration with location verification
   * @param gaugeId - Gauge identifier
   * @param storageLocation - Storage location for the released gauge
   */
  async releaseFromCalibration(
    gaugeId: string,
    storageLocation: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/calibration/gauges/${gaugeId}/release`, {
      storage_location: storageLocation
    });
  }

  // ==========================================
  // PHASE 0: CUSTOMER RETURN OPERATIONS
  // ==========================================

  /**
   * Return a customer-owned gauge
   * @param gaugeId - ID of the gauge to return
   * @param reason - Reason for return
   */
  async returnCustomerGauge(
    gaugeId: number,
    reason: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/gauges/${gaugeId}/return-customer`, { reason });
  }

  /**
   * Get returned customer gauges with optional filters
   * @param params - Optional filter parameters
   */
  async getReturnedCustomerGauges(params?: {
    customerId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<GaugeListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('status', 'returned');

    if (params?.customerId) searchParams.append('customer_id', params.customerId.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return apiClient.get<GaugeListResponse>(`/gauges?${searchParams}`);
  }

  /**
   * SERIAL NUMBER SYSTEM: Get spare thread gauges
   * @param filters - Optional filters (thread_size, thread_class, gauge_type)
   */
  async getSpareThreadGauges(filters?: {
    thread_size?: string;
    thread_class?: string;
    is_go_gauge?: boolean;
  }): Promise<ApiResponse<Gauge[]>> {
    const searchParams = new URLSearchParams();
    if (filters?.thread_size) searchParams.append('thread_size', filters.thread_size);
    if (filters?.thread_class) searchParams.append('thread_class', filters.thread_class);
    if (filters?.is_go_gauge !== undefined) searchParams.append('is_go_gauge', String(filters.is_go_gauge));

    return apiClient.get(`/gauges/v2/spares?${searchParams}`);
  }

  /**
   * SERIAL NUMBER SYSTEM: Pair two spare thread gauges by serial number
   * @param goSerialNumber - GO gauge serial number
   * @param noGoSerialNumber - NO GO gauge serial number
   * @param sharedData - Shared data (storage_location, etc.)
   */
  async pairSparesBySerial(
    goSerialNumber: string,
    noGoSerialNumber: string,
    sharedData?: { storage_location?: string }
  ): Promise<ApiResponse<{ setId: string; goGaugeId: number; noGoGaugeId: number }>> {
    return apiClient.post('/gauges-v2/pair-spares-by-serial', {
      go_serial_number: goSerialNumber,
      nogo_serial_number: noGoSerialNumber,
      ...sharedData
    });
  }


  /**
   * SERIAL NUMBER SYSTEM: Unpair a gauge set by set ID
   * @param setId - Set ID (gauge_id)
   */
  async unpairSetBySetId(setId: string): Promise<ApiResponse<{ goGaugeId: number; noGoGaugeId: number }>> {
    return apiClient.post(`/gauges-v2/unpair-set/${setId}`);
  }

  /**
   * SERIAL NUMBER SYSTEM: Replace a gauge in a set
   * @param setId - Set ID
   * @param oldSerialNumber - Serial number of gauge to remove
   * @param newSerialNumber - Serial number of replacement gauge
   */
  async replaceGaugeInSet(
    setId: string,
    oldSerialNumber: string,
    newSerialNumber: string
  ): Promise<ApiResponse<{ setId: string; oldGaugeId: number; newGaugeId: number }>> {
    return apiClient.post(`/gauges-v2/replace-in-set/${setId}`, {
      old_serial_number: oldSerialNumber,
      new_serial_number: newSerialNumber
    });
  }

  // ==========================================
  // INVENTORY INTEGRATION
  // ==========================================

  /**
   * Get current location from inventory system
   * @param gaugeId - Gauge identifier (gauge_id or serial_number)
   * @returns Current location data or null if not found
   */
  async getCurrentLocation(gaugeId: string): Promise<{
    current_location: string;
    quantity: number;
    last_moved_at: string;
    last_moved_by: number;
  } | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          current_location: string;
          quantity: number;
          last_moved_at: string;
          last_moved_by: number;
        } | null;
      }>(`/inventory/location/gauge/${gaugeId}`);
      return response.data;
    } catch (error) {
      // Return null if not found in inventory (expected for legacy gauges)
      return null;
    }
  }

  /**
   * Get list of distinct manufacturers
   * @returns Promise<string[]> - Array of manufacturer names
   */
  async getManufacturers(): Promise<string[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: string[];
    }>('/gauges/v2/manufacturers');
    return response.data;
  }
}

// Singleton instance
export const gaugeService = new GaugeService();