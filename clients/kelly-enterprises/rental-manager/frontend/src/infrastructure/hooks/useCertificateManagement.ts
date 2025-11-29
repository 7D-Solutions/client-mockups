/**
 * useCertificateManagement Hook
 *
 * Centralized certificate management for gauge calibration certificates.
 * Handles upload, download, rename, delete, and sync operations with Dropbox.
 *
 * Features:
 * - Auto-sync from Dropbox before loading
 * - Duplicate detection and validation
 * - Rename with duplicate checking
 * - Delete with confirmation
 * - Drag-and-drop support
 * - File type validation
 *
 * Usage:
 * ```tsx
 * const {
 *   certificates,
 *   loading,
 *   uploading,
 *   uploadError,
 *   uploadSuccess,
 *   loadCertificates,
 *   uploadCertificate,
 *   deleteCertificate,
 *   renameCertificate,
 *   syncCertificates,
 *   startEditName,
 *   saveName,
 *   cancelEdit,
 *   clearMessages
 * } = useCertificateManagement(gaugeId);
 * ```
 */

import { useState, useCallback } from 'react';
import { certificateService, type Certificate } from '../../modules/gauge/services/certificateService';
import { gaugeService } from '../../modules/gauge/services/gaugeService';
import { useToast } from '../components';
import { logger } from '../utils/logger';

export interface UseCertificateManagementReturn {
  // State
  certificates: Certificate[];
  loading: boolean;
  uploading: boolean;
  syncing: boolean;
  uploadError: string | null;
  uploadSuccess: string | null;
  deletingId: string | number | null;
  editingId: string | number | null;
  editingName: string;
  newlyUploadedId: string | number | null;

  // Actions
  loadCertificates: () => Promise<void>;
  uploadCertificate: (file: File) => Promise<void>;
  deleteCertificate: (certificate: Certificate) => Promise<void>;
  syncCertificates: () => Promise<{ syncedCount: number; removedCount: number } | null>;
  startEditName: (certificate: Certificate) => void;
  setEditingName: (name: string) => void;
  saveName: (certificate: Certificate) => Promise<void>;
  cancelEdit: () => void;
  clearMessages: () => void;
}

/**
 * Hook for managing gauge calibration certificates
 * @param gaugeId - Gauge ID or gauge_id string
 */
export function useCertificateManagement(gaugeId: string | undefined): UseCertificateManagementReturn {
  const toast = useToast();

  // Certificate list state
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [newlyUploadedId, setNewlyUploadedId] = useState<string | number | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingName, setEditingName] = useState('');

  /**
   * Load certificates for the gauge
   * Automatically syncs from Dropbox before loading
   */
  const loadCertificates = useCallback(async () => {
    if (!gaugeId) return;

    setLoading(true);
    try {
      // Automatically sync from Dropbox before loading certificates
      // This allows users to add certificates directly to Dropbox folder
      try {
        await certificateService.sync(gaugeId);
      } catch (syncError) {
        logger.warn('Failed to sync certificates from storage', syncError);
        // Continue loading even if sync fails
      }

      // Load certificates after sync
      const response = await certificateService.list(gaugeId);
      setCertificates(response.certificates);
    } catch (error: any) {
      logger.error('Failed to load certificates', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, [gaugeId]);

  /**
   * Upload a certificate file
   * @param file - File to upload
   */
  const uploadCertificate = useCallback(async (file: File) => {
    if (!gaugeId) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const uploadFormData = new FormData();
    uploadFormData.append('certificate', file);

    try {
      const uploadResponse = await gaugeService.uploadCertificate(gaugeId, uploadFormData);

      if (uploadResponse.success) {
        const certificateName = uploadResponse.data?.customName || uploadResponse.data?.fileName || file.name;
        const certificateId = uploadResponse.data?.id;
        setUploadSuccess(`Certificate "${certificateName}" uploaded successfully. You can rename it below.`);

        // Auto-clear success message after 5 seconds
        setTimeout(() => setUploadSuccess(null), 5000);

        // Reload certificates
        await loadCertificates();

        // Automatically start editing the newly uploaded certificate
        if (certificateId) {
          setNewlyUploadedId(certificateId);
          setEditingId(certificateId);
          setEditingName(certificateName);
        }
      }
    } catch (uploadError: any) {
      const errorMessage = uploadError.message || 'Failed to upload certificate';

      // Check if it's a duplicate file error
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        // Extract existing filename from error message if available
        const filenameMatch = errorMessage.match(/"([^"]+)"/);
        const existingFilename = filenameMatch ? filenameMatch[1] : 'an existing certificate';
        setUploadError(`This file has already been uploaded. The content matches "${existingFilename}". To replace it, delete the existing certificate first, then upload the new one.`);
      } else {
        setUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  }, [gaugeId, loadCertificates]);

  /**
   * Delete a certificate
   * @param certificate - Certificate to delete
   */
  const deleteCertificate = useCallback(async (certificate: Certificate) => {
    if (!gaugeId) return;

    setDeletingId(certificate.id);
    try {
      await certificateService.delete(gaugeId, certificate.id);
      toast.success('Success', 'Certificate deleted successfully');
      await loadCertificates();
    } catch (error: any) {
      logger.error('Failed to delete certificate', error);
      toast.error('Delete Failed', error.message || 'Failed to delete certificate');
    } finally {
      setDeletingId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaugeId, loadCertificates]);

  /**
   * Sync certificates from Dropbox
   * Returns sync statistics (added/removed counts)
   */
  const syncCertificates = useCallback(async () => {
    if (!gaugeId) return null;

    setSyncing(true);
    try {
      const response = await certificateService.sync(gaugeId);
      const syncedCount = response.syncedCount || 0;
      const removedCount = (response as any).removedCount || 0;

      // Show appropriate message based on what changed
      if (syncedCount > 0 && removedCount > 0) {
        toast.success('Sync Complete', `Added ${syncedCount} and removed ${removedCount} certificate(s)`);
      } else if (syncedCount > 0) {
        toast.success('Sync Complete', `Added ${syncedCount} certificate(s) from storage`);
      } else if (removedCount > 0) {
        toast.success('Sync Complete', `Removed ${removedCount} certificate(s) deleted from storage`);
      } else {
        toast.success('Sync Complete', 'All certificates are up to date');
      }

      // Reload certificates
      await loadCertificates();

      return { syncedCount, removedCount };
    } catch (error: any) {
      logger.error('Failed to sync certificates', error);
      toast.error('Sync Failed', error.message || 'Failed to sync certificates from storage');
      return null;
    } finally {
      setSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaugeId, loadCertificates]);

  /**
   * Start editing a certificate name
   * @param certificate - Certificate to edit
   */
  const startEditName = useCallback((certificate: Certificate) => {
    setEditingId(certificate.id);
    setEditingName(
      certificate.customName || certificateService.formatCertificateName(certificate.customName, certificate.name, certificate.uploadedAt)
    );
  }, []);

  /**
   * Save edited certificate name
   * @param certificate - Certificate being edited
   */
  const saveName = useCallback(async (certificate: Certificate) => {
    if (!gaugeId || !editingName.trim()) return;

    // Check for duplicate names
    const trimmedName = editingName.trim();
    const isDuplicate = certificates.some(cert =>
      cert.id !== certificate.id &&
      (cert.customName === trimmedName ||
       certificateService.formatCertificateName(cert.customName, cert.name, cert.uploadedAt) === trimmedName)
    );

    if (isDuplicate) {
      toast.error('Duplicate Name', 'A certificate with this name already exists. Please choose a different name.');
      return;
    }

    try {
      await certificateService.rename(gaugeId, certificate.id, trimmedName);
      toast.success('Success', 'Certificate renamed successfully');
      setEditingId(null);
      setEditingName('');
      setNewlyUploadedId(null);

      // Reload certificates
      await loadCertificates();
    } catch (error: any) {
      logger.error('Failed to rename certificate', error);
      toast.error('Rename Failed', error.message || 'Failed to rename certificate');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaugeId, editingName, certificates, loadCertificates]);

  /**
   * Cancel editing certificate name
   */
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName('');
    setNewlyUploadedId(null);
  }, []);

  /**
   * Clear upload messages
   */
  const clearMessages = useCallback(() => {
    setUploadError(null);
    setUploadSuccess(null);
  }, []);

  return {
    // State
    certificates,
    loading,
    uploading,
    syncing,
    uploadError,
    uploadSuccess,
    deletingId,
    editingId,
    editingName,
    newlyUploadedId,

    // Actions
    loadCertificates,
    uploadCertificate,
    deleteCertificate,
    syncCertificates,
    startEditName,
    setEditingName,
    saveName,
    cancelEdit,
    clearMessages
  };
}
