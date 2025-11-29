// For Claude: Use Modal instead of window dialogs
// Use Button and FormInput components instead of raw HTML elements
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormInput } from './FormInput';
import { TooltipToggle } from './TooltipToggle';
import { apiClient } from '../api/client';
import { useSharedActions } from '../store';
import { useLogger } from '../utils/logger';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requireCurrent?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requireCurrent = true
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addNotification } = useSharedActions();
  const logger = useLogger('ChangePasswordModal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      addNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been changed successfully'
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err: any) {
      logger.errorWithStack('Failed to change password', err instanceof Error ? err : new Error(String(err)));
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Password">
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          {error && (
            <div style={{
              backgroundColor: 'var(--color-danger-light-bg)',
              border: '1px solid var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              You must change your password before continuing.
            </p>
          </div>

          {requireCurrent && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '600',
                color: 'var(--color-text-primary)'
              }}>
                Current Password
              </label>
              <FormInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                tooltip="Enter your current password to verify your identity"
              />
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              New Password
            </label>
            <FormInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
              tooltip="Create a new password with at least 8 characters for security"
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              Confirm New Password
            </label>
            <FormInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
              tooltip="Re-enter your new password to confirm it matches"
            />
          </div>
        </Modal.Body>

        <Modal.Actions>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            loading={loading}
          >
            Change Password
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};
