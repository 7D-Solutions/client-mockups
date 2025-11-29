// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button components instead of raw <button> elements
// Use FormInput instead of raw <input>
import React, { useState } from 'react';
import { Modal, Button, FormInput, ResetPasswordButton, CancelButton, DoneButton, TooltipToggle } from '../../../infrastructure/components';
import { sanitizeName } from '../../../infrastructure/utils/sanitize';
import { useLogger } from '../../../infrastructure/utils/logger';
import { useSharedActions } from '../../../infrastructure/store';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; username: string; firstName: string; lastName: string };
  onReset: (userId: string, password?: string) => Promise<{ temporaryPassword: string }>;
}

// Generate a secure temporary password
const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure at least one uppercase, one lowercase, one number, and one special char
  if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[0-9]/.test(password)) password = password.slice(0, -2) + '1' + password.slice(-1);
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';
  return password;
};

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onReset
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [editablePassword, setEditablePassword] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);
  const logger = useLogger('ResetPasswordModal');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addNotification } = useSharedActions();

  // Auto-generate password when modal opens
  React.useEffect(() => {
    if (isOpen && !editablePassword) {
      setEditablePassword(generateTempPassword());
    }
  }, [isOpen, editablePassword]);

  const handleReset = async () => {
    if (!editablePassword.trim()) {
      setError('Password cannot be empty');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onReset(user.id, editablePassword);
      setTemporaryPassword(editablePassword);
      setPasswordSet(true);
      const userName = `${user.firstName} ${user.lastName}`;
      addNotification({
        type: 'success',
        title: 'Password Reset',
        message: `Password for ${userName} was reset`
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = () => {
    setEditablePassword(generateTempPassword());
  };

  const handleCopyPassword = async () => {
    if (temporaryPassword) {
      try {
        await navigator.clipboard.writeText(temporaryPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        logger.errorWithStack('Failed to copy password to clipboard', err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  const handleClose = () => {
    setTemporaryPassword('');
    setEditablePassword('');
    setPasswordSet(false);
    setError('');
    setShowPassword(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password">
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

        {!passwordSet ? (
          <>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              <p style={{ marginBottom: 'var(--space-2)', marginTop: 0 }}>
                Reset password for:
              </p>

              <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)'
              }}>
                <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
                  {sanitizeName(user.firstName)} {sanitizeName(user.lastName)}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                  Username: {sanitizeName(user.username)}
                </p>
              </div>

              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Temporary Password
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <FormInput
                      type={showPassword ? 'text' : 'password'}
                      value={editablePassword}
                      onChange={(e) => setEditablePassword(e.target.value)}
                      placeholder="Auto-generated password"
                      style={{
                        fontFamily: 'var(--font-mono)'
                      }}
                      tooltip="Temporary password that will be assigned to the user (auto-generated or custom). User must change on next login."
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    variant="secondary"
                    size="sm"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGenerateNew}
                    variant="secondary"
                    size="sm"
                    title="Generate new password"
                  >
                    🔄
                  </Button>
                </div>
              </div>

              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-warning)',
                marginBottom: 0,
                marginTop: 'var(--space-2)'
              }}>
                ⚠️ The user will be required to change this password on next login.
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{
              backgroundColor: 'var(--color-success-light-bg)',
              border: '1px solid var(--color-success-light)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)'
            }}>
              <h3 style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-success-dark)',
                marginBottom: 'var(--space-2)',
                marginTop: 0
              }}>
                Password Reset Successful
              </h3>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-success-dark)',
                marginBottom: 'var(--space-3)',
                marginTop: 0
              }}>
                A new temporary password has been generated for {sanitizeName(user.firstName)} {sanitizeName(user.lastName)}.
              </p>
              
              <div style={{
                background: 'var(--color-bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-success-light)',
                padding: 'var(--space-4)'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-1)'
                }}>
                  Temporary Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <FormInput
                      type={showPassword ? 'text' : 'password'}
                      value={temporaryPassword}
                      onChange={() => {}} // Read-only field
                      readOnly
                      style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--color-bg-secondary)'
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    variant="secondary"
                    size="sm"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCopyPassword}
                    variant="secondary"
                    size="sm"
                    style={copied ? {
                      backgroundColor: 'var(--color-success-light-bg)',
                      color: 'var(--color-success-dark)'
                    } : undefined}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div style={{
                marginTop: 'var(--space-3)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                <p style={{ margin: 0 }}>📋 Please provide this temporary password to the user securely.</p>
                <p style={{ margin: 0 }}>🔒 The user will be required to change this password on their next login.</p>
              </div>
            </div>
          </>
        )}
      </Modal.Body>
      
      <Modal.Actions>
        {!temporaryPassword ? (
          <>
            <ResetPasswordButton 
              onClick={handleReset}
              disabled={loading}
              loading={loading}
            />
            <CancelButton 
              onClick={handleClose} 
              disabled={loading}
            />
          </>
        ) : (
          <DoneButton 
            onClick={handleClose}
          />
        )}
      </Modal.Actions>
    </Modal>
  );
};