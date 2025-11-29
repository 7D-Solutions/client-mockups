import { apiClient } from '../../../infrastructure/api/client';

export interface Certificate {
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
  id: string | number;
  customName?: string;
  sharedLink?: string;
  uploadedBy?: string;
}

export interface CertificateListResponse {
  gaugeId: string;
  gaugeName: string;
  certificates: Certificate[];
}

/**
 * Certificate Service
 * Handles certificate upload, listing, and deletion
 */
export const certificateService = {
  /**
   * List all certificates for a gauge
   */
  async list(gaugeId: string): Promise<CertificateListResponse> {
    const response = await apiClient.get(`/gauges/${gaugeId}/certificates`);
    return response.data;
  },

  /**
   * Delete a certificate
   */
  async delete(gaugeId: string, certificateId: string | number): Promise<void> {
    await apiClient.delete(`/gauges/${gaugeId}/certificates/${certificateId}`);
  },

  /**
   * Rename a certificate
   */
  async rename(gaugeId: string, certificateId: string | number, customName: string): Promise<void> {
    await apiClient.patch(`/gauges/${gaugeId}/certificates/${certificateId}`, {
      customName
    });
  },

  /**
   * Sync certificates from Dropbox to database
   */
  async sync(gaugeId: string): Promise<{ syncedCount: number; syncedCertificates: any[] }> {
    const response = await apiClient.post(`/gauges/${gaugeId}/certificates/sync`);
    return response.data;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Format upload date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format certificate name for display
   * Returns custom name if available, otherwise generates default format
   * Format: {EXTENSION}_Certificate_{YYYY.MM.DD} (matches backend default)
   */
  formatCertificateName(customName: string | undefined, filename: string, uploadedAt: string): string {
    // If custom name exists, return it
    if (customName) {
      return customName;
    }

    // Otherwise, generate default name matching backend format
    // Extract extension from filename
    const extension = filename.split('.').pop()?.toUpperCase() || 'FILE';

    // Parse date from uploadedAt and format as YYYY.MM.DD
    const date = new Date(uploadedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateCode = `${year}.${month}.${day}`;

    // Format: {EXTENSION}_Certificate_{YYYY.MM.DD}
    // Note: Suffix (_2, _3, etc.) is added by backend if duplicate
    return `${extension}_Certificate_${dateCode}`;
  }
};
