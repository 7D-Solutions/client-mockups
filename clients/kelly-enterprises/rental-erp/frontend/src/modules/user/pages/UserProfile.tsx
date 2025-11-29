import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { LoadingSpinner, Button, FormInput, useToast, Card, CardHeader, CardTitle, CardContent } from '../../../infrastructure';
import { UserProfile as UserProfileType } from '../types';

export const UserProfile: React.FC = () => {
  const toast = useToast();
  const {
    profile,
    isProfileLoading,
    isUpdatingProfile,
    profileError,
    updateProfile
  } = useUserProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfileType>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        department: profile.department,
        position: profile.position,
      });
    }
  }, [profile, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: profile?.name,
      email: profile?.email,
      phone: profile?.phone,
      department: profile?.department,
      position: profile?.position,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile Updated', 'Your profile has been updated successfully');
    } catch (error: any) {
      toast.error('Update Failed', error.message || 'Failed to update profile');
    }
  };

  const handleInputChange = (field: keyof UserProfileType, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isProfileLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', color: 'var(--color-danger)' }}>
          Error Loading Profile
        </h2>
        <p style={{ color: 'var(--color-gray-600)' }}>
          Failed to load your profile information. Please try again.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', color: 'var(--color-danger)' }}>
          Profile Not Found
        </h2>
        <p style={{ color: 'var(--color-gray-600)' }}>
          Your profile information could not be found.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>
          My Profile
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
          Manage your personal information and account details
        </p>
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle>Personal Information</CardTitle>
            {!isEditing ? (
              <Button onClick={handleEdit} variant="outline">
                Edit Profile
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isUpdatingProfile}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Full Name
              </label>
              {isEditing ? (
                <FormInput
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  error={errors.name}
                />
              ) : (
                <div style={{ padding: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{profile.name}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Email Address
              </label>
              {isEditing ? (
                <FormInput
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  error={errors.email}
                />
              ) : (
                <div style={{ padding: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{profile.email}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Phone Number
              </label>
              {isEditing ? (
                <FormInput
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                  error={errors.phone}
                />
              ) : (
                <div style={{ padding: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{profile.phone || 'Not provided'}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Department
              </label>
              {isEditing ? (
                <FormInput
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Enter your department"
                />
              ) : (
                <div style={{ padding: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{profile.department || 'Not specified'}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Position
              </label>
              {isEditing ? (
                <FormInput
                  value={formData.position || ''}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Enter your position"
                />
              ) : (
                <div style={{ padding: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{profile.position || 'Not specified'}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Role
              </label>
              <div style={{ padding: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{profile.role || 'User'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                Username:
              </span>
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {profile.username || 'Not set'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                User ID:
              </span>
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                {profile.id}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                Member Since:
              </span>
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                Last Updated:
              </span>
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};