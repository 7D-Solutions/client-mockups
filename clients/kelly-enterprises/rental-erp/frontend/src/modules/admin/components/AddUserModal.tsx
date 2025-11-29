// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use Form components instead of raw <input>, <checkbox>
// Two-step wizard: Step 1 = User details, Step 2 = Permissions (using PermissionSelector)
import React, { useState } from 'react';
import { Modal, Button, TooltipToggle, FormInput } from '../../../infrastructure/components';
import { PermissionSelector } from './PermissionSelector';
import { CreateUserData } from '../types';
import { sanitizeName, sanitizeEmail } from '../../../infrastructure/utils/sanitize';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserData & { permissions: number[] }) => Promise<void>;
  availableRoles?: { id: string; name: string }[]; // Still passed for compatibility, but not used
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        password: ''
      });
      setSelectedPermissions(new Set());
      setError('');
    }
  }, [isOpen]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate Step 1 fields
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Move to Step 2
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');

    // Validate at least one permission selected
    if (selectedPermissions.size === 0) {
      setError('Please select at least one permission');
      return;
    }

    setLoading(true);

    try {
      // Sanitize form data before submission
      const sanitizedData = {
        firstName: sanitizeName(formData.firstName),
        lastName: sanitizeName(formData.lastName),
        email: formData.email ? sanitizeEmail(formData.email) : '',
        password: formData.password,
        permissions: Array.from(selectedPermissions)
      };

      await onSubmit(sanitizedData);

      // Reset form on successful submission
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        password: ''
      });
      setSelectedPermissions(new Set());
      setCurrentStep(1);
      // Parent will close modal
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New User"
      size={currentStep === 1 ? 'md' : 'xl'}
    >
      {/* Step Progress Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-default)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: currentStep === 1 ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
          color: currentStep === 1 ? 'var(--color-primary)' : currentStep === 2 ? 'var(--color-success)' : 'var(--color-text-secondary)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            background: currentStep === 1 ? 'var(--color-primary)' : 'var(--color-success)',
            color: 'white'
          }}>
            {currentStep === 2 ? '✓' : '●'}
          </div>
          <span>User Details</span>
        </div>
        <div style={{ color: 'var(--color-border-default)' }}>→</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: currentStep === 2 ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
          color: currentStep === 2 ? 'var(--color-primary)' : 'var(--color-text-secondary)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            background: currentStep === 2 ? 'var(--color-primary)' : 'var(--color-border-default)',
            color: currentStep === 2 ? 'white' : 'var(--color-text-secondary)'
          }}>
            {currentStep === 2 ? '●' : '○'}
          </div>
          <span>Permissions</span>
        </div>
        <div style={{
          marginLeft: 'auto',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-tertiary)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-full)'
        }}>
          Step {currentStep} of 2
        </div>
      </div>

      <Modal.Body>
        <TooltipToggle />

        {error && (
          <div style={{
            backgroundColor: 'var(--color-danger-light-bg)',
            border: '1px solid var(--color-danger-light)',
            color: 'var(--color-danger-dark)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)'
          }}>
            {error}
          </div>
        )}

        {/* Step 1: User Details */}
        {currentStep === 1 && (
          <form onSubmit={handleNext}>
            <FormInput
              label="First Name"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              disabled={loading}
              tooltip="Enter the user's first name or given name"
            />

            <FormInput
              label="Last Name"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              disabled={loading}
              tooltip="Enter the user's last name or surname"
            />

            <FormInput
              label="Email (optional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              placeholder="user@example.com"
              tooltip="Optional email address for notifications and account recovery"
            />

            <FormInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
              minLength={8}
              title="Password must be at least 8 characters long"
              style={{ marginBottom: 'var(--space-1)' }}
              tooltip="Create a secure password with at least 8 characters"
            />
            <p style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: 0,
              marginBottom: 'var(--space-4)'
            }}>
              Must be at least 8 characters long
            </p>
          </form>
        )}

        {/* Step 2: Permissions */}
        {currentStep === 2 && (
          <>
            <div style={{
              background: 'var(--color-info-light-bg)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-info-dark)'
            }}>
              Setting permissions for: <strong>{formData.firstName} {formData.lastName}</strong>
              {formData.email && <> ({formData.email})</>}
            </div>

            <PermissionSelector
              selectedPermissions={selectedPermissions}
              onPermissionsChange={setSelectedPermissions}
              disabled={loading}
              showPendingChanges={false}
            />
          </>
        )}
      </Modal.Body>

      <Modal.Actions>
        {currentStep === 1 ? (
          <>
            <Button
              type="button"
              onClick={handleNext}
              disabled={loading}
            >
              Next: Set Permissions
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={handleBack}
              variant="secondary"
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || selectedPermissions.size === 0}
            >
              {loading ? 'Creating...' : `Create User${selectedPermissions.size > 0 ? ` (${selectedPermissions.size} permissions)` : ''}`}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
          </>
        )}
      </Modal.Actions>
    </Modal>
  );
};
