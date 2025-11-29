// Password Modal - for changing user password
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormInput } from './FormInput';
import { FormCheckbox } from './FormCheckbox';
import { TooltipToggle } from './TooltipToggle';
import { useToast } from './Toast';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export const PasswordModal = ({ isOpen, onClose }: PasswordModalProps) => {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { logout } = useAuth();
  const [formData, setFormData] = useState<PasswordChangeData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState(false);

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const response = await apiClient.post('/auth/change-password', {
        currentPassword: data.current_password,
        newPassword: data.new_password
      });
      return response;
    },
    onSuccess: async () => {
      showSuccessToast('Password Changed', 'Password changed successfully. Please log in again.');
      handleClose();
      // Log out user after password change for security
      setTimeout(async () => {
        await logout();
      }, 1500); // Give user time to see the success message
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      showErrorToast('Password Change Failed', message);
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.current_password) {
      newErrors.current_password = 'Current password is required';
    }
    
    if (!formData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)) {
      newErrors.new_password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your new password';
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    if (formData.current_password === formData.new_password) {
      newErrors.new_password = 'New password must be different from current password';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    changePasswordMutation.mutate({
      current_password: formData.current_password,
      new_password: formData.new_password
    });
  };

  const handleInputChange = (field: keyof PasswordChangeData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    setFormData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setErrors({});
    setShowPasswords(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)'
          }}>
            {/* Current Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                Current Password
              </label>
              <FormInput
                type={showPasswords ? 'text' : 'password'}
                value={formData.current_password}
                onChange={(e) => handleInputChange('current_password', e.target.value)}
                placeholder="Enter current password"
                error={errors.current_password}
                autoComplete="current-password"
                tooltip="Enter your current password to verify your identity"
              />
            </div>
        
            {/* New Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                New Password
              </label>
              <FormInput
                type={showPasswords ? 'text' : 'password'}
                value={formData.new_password}
                onChange={(e) => handleInputChange('new_password', e.target.value)}
                placeholder="Enter new password"
                error={errors.new_password}
                autoComplete="new-password"
                tooltip="Create a strong password with at least 8 characters, including uppercase, lowercase, and number"
              />
              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                marginTop: 'var(--space-1)'
              }}>
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
        
            {/* Confirm Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                Confirm New Password
              </label>
              <FormInput
                type={showPasswords ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                placeholder="Confirm new password"
                error={errors.confirm_password}
                autoComplete="new-password"
                tooltip="Re-enter your new password to confirm it matches"
              />
            </div>
            
            {/* Show/Hide Password Toggle */}
            <FormCheckbox
              label="Show passwords"
              checked={showPasswords}
              onChange={setShowPasswords}
              tooltip="Toggle visibility of password fields to verify what you've typed"
            />
            
            {/* Security Notice */}
            <div style={{
              backgroundColor: 'var(--color-warning-light)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-warning-dark)',
                margin: 0
              }}>
                For security reasons, you will be logged out after changing your password.
              </p>
            </div>
          </div>
        </Modal.Body>
        
        <Modal.Actions>
          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={changePasswordMutation.isPending}
          >
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};