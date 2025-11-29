import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, LoadingSpinner, TooltipToggle } from '../../../infrastructure/components';
import { adminService } from '../services/adminService';
import { useLogger } from '../../../infrastructure/utils/logger';
import { PermissionSelector } from './PermissionSelector';

interface PermissionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export const PermissionManagementModal: React.FC<PermissionManagementModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName
}) => {
  const logger = useLogger('PermissionManagementModal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userPermissions, setUserPermissions] = useState<Set<number>>(new Set());
  const [initialPermissions, setInitialPermissions] = useState<Set<number>>(new Set());

  const loadPermissions = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError('');
    try {
      // Load user's current permissions
      const userPerms = await adminService.getUserPermissions(userId);
      const permissionIds = new Set(userPerms.map((p: any) => p.id));
      setUserPermissions(permissionIds);
      setInitialPermissions(new Set(permissionIds));
    } catch (err: any) {
      // Retry on 503 (database not ready) up to 3 times
      if (err.response?.status === 503 && retryCount < 3) {
        logger.warn(`Database not ready, retrying... (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s
        return loadPermissions(retryCount + 1);
      }

      logger.errorWithStack('Failed to load permissions', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, loadPermissions]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Calculate differences
      const toAdd = Array.from(userPermissions).filter(id => !initialPermissions.has(id));
      const toRemove = Array.from(initialPermissions).filter(id => !userPermissions.has(id));

      // Remove permissions in bulk
      if (toRemove.length > 0) {
        await adminService.revokePermissionsBulk(userId, toRemove);
      }

      // Add permissions in bulk
      if (toAdd.length > 0) {
        await adminService.grantPermissionsBulk(userId, toAdd);
      }

      setSuccess('Permissions updated successfully');

      // Reload permissions to reflect changes
      await loadPermissions();

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      logger.errorWithStack('Failed to save permissions', err);
      setError(err.response?.data?.message || err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = () => {
    const toAdd = Array.from(userPermissions).filter(id => !initialPermissions.has(id));
    const toRemove = Array.from(initialPermissions).filter(id => !userPermissions.has(id));
    return toAdd.length > 0 || toRemove.length > 0;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Permissions - ${userName}`} size="xl">
      <Modal.Body>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <TooltipToggle />

            {error && (
              <div style={{
                color: 'var(--color-danger)',
                backgroundColor: 'var(--color-danger-bg)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--font-size-sm)'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                color: 'var(--color-success)',
                backgroundColor: 'var(--color-success-bg)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--font-size-sm)'
              }}>
                {success}
              </div>
            )}

            <PermissionSelector
              selectedPermissions={userPermissions}
              onPermissionsChange={setUserPermissions}
              disabled={saving}
              showPendingChanges={true}
              initialPermissions={initialPermissions}
            />
          </>
        )}
      </Modal.Body>

      <Modal.Actions>
        <Button
          onClick={handleSave}
          disabled={!hasPendingChanges() || saving || loading}
        >
          {saving ? 'Saving...' : hasPendingChanges() ? `Save Changes (${Array.from(userPermissions).filter(id => !initialPermissions.has(id)).length + Array.from(initialPermissions).filter(id => !userPermissions.has(id)).length})` : 'Save Changes'}
        </Button>
        <Button
          onClick={onClose}
          variant="secondary"
          disabled={saving}
        >
          {hasPendingChanges() ? 'Cancel' : 'Close'}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};
