// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use Form components instead of raw <input>, <checkbox>
import React, { useState } from 'react';
import { DetailModal, Button, Badge, FormInput, FormCheckbox } from '../../../infrastructure/components';
import { User, UpdateUserData } from '../types';
import { sanitizeName, sanitizeEmail } from '../../../infrastructure/utils/sanitize';
import { PermissionManagementModal } from './PermissionManagementModal';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (userId: string, userData: UpdateUserData) => Promise<void>;
  availableRoles?: { id: string; name: string }[];
  currentUserId?: string | number; // Current logged-in user ID
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate,
  _availableRoles = [],
  currentUserId
}) => {
  // Check if user is editing their own account
  const _isEditingSelf = currentUserId && (String(user.id) === String(currentUserId));
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [formData, setFormData] = useState<UpdateUserData>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onUpdate(user.id, formData);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive,
      roles: user.roles
    });
    setIsEditing(false);
    setError('');
  };

  return (
    <>
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="md"
      editButton={
        !isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            Edit User
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        )
      }
      actionButtons={
        !isEditing ? (
          <>
            <Button onClick={() => setShowPermissionModal(true)} variant="secondary">
              Manage Permissions
            </Button>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={handleCancel}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
        )
      }
    >
      <DetailModal.Body>
        <div>
          {error && (
            <div style={{
              color: 'var(--color-danger)',
              backgroundColor: 'var(--color-danger-bg)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {error}
            </div>
          )}

          {!isEditing ? (
            <>
              {/* View Mode */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-4)'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: 'var(--font-size-xl)',
                    fontWeight: 'var(--font-weight-semibold)'
                  }}>
                    {sanitizeName(user.firstName)} {sanitizeName(user.lastName)}
                  </h3>
                  <Badge size="sm" variant={user.isActive ? 'success' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-1)'
                  }}>Username</label>
                  <p style={{ margin: 0, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                    {user.username || 'Not set'}
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-1)'
                  }}>Email</label>
                  <p style={{ margin: 0 }}>{user.email ? sanitizeEmail(user.email) : 'Not set'}</p>
                </div>

                <div style={{
                  marginTop: 'var(--space-4)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--space-1)'
                    }}>Created</label>
                    <p style={{ margin: 0 }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--space-1)'
                    }}>Last Login</label>
                    <p style={{ margin: 0 }}>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

            </>
          ) : (
            <>
              {/* Edit Mode */}
              <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
                {/* Username (Read-only) */}
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-1)'
                  }}>Username</label>
                  <div style={{
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'var(--color-gray-100)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    color: 'var(--color-primary)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    {user.username || 'Not set'}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-2)'
                }}>
                  <div style={{ marginBottom: 0 }}>
                    <FormInput
                      label={<>First Name <span style={{ color: 'var(--color-danger)' }}>*</span></>}
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      disabled={loading}
                      className="compact-input"
                    />
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    <FormInput
                      label={<>Last Name <span style={{ color: 'var(--color-danger)' }}>*</span></>}
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      disabled={loading}
                      className="compact-input"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <FormInput
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                    className="compact-input"
                  />
                </div>

                {/* Status */}
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <FormCheckbox
                    label="Active User"
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    disabled={loading}
                    className="compact-checkbox"
                  />
                </div>

              </form>
              <style>{`
                .compact-input {
                  margin-bottom: 0 !important;
                }
                .compact-checkbox {
                  margin-bottom: 0 !important;
                }
              `}</style>
            </>
          )}
        </div>
      </DetailModal.Body>
    </DetailModal>

    {/* Permission Management Modal */}
    <PermissionManagementModal
      isOpen={showPermissionModal}
      onClose={() => setShowPermissionModal(false)}
      userId={user.id}
      userName={`${user.firstName} ${user.lastName}`}
    />
    </>
  );
};