import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { eventBus, EVENTS, LoadingSpinner, Button, FormSelect, FormCheckbox, useToast, CardContent } from '../../../infrastructure';
import { UserPreferences } from '../types';

export const UserSettings: React.FC = () => {
  const toast = useToast();
  const {
    preferences,
    isPreferencesLoading,
    isUpdatingPreferences,
    updatePreferences
  } = useUserProfile();

  const [formData, setFormData] = useState<Partial<UserPreferences>>({});

  React.useEffect(() => {
    if (preferences) {
      setFormData({
        theme: preferences.theme || 'light',
        language: preferences.language || 'en',
        timezone: preferences.timezone || 'UTC',
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        gaugeAlerts: preferences.gaugeAlerts ?? true,
        maintenanceReminders: preferences.maintenanceReminders ?? true,
      });
    }
  }, [preferences]);

  const handleShowPasswordModal = () => {
    eventBus.emit(EVENTS.SHOW_PASSWORD_MODAL);
  };

  const handlePreferenceChange = (field: keyof UserPreferences, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePreferences = async () => {
    try {
      await updatePreferences(formData);
      toast.success('Settings Saved', 'Your preferences have been updated successfully');
    } catch (error: any) {
      toast.error('Save Failed', error.message || 'Failed to save preferences');
    }
  };

  if (isPreferencesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>
          User Settings
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          Customize your account preferences and security settings
        </p>
      </div>

      {/* Security Settings */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-xl)', fontWeight: '600' }}>Security</h2>
          <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
            Manage your account security and password
          </p>
        </div>

        <Card>
          <CardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>Password</h3>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                  Change your account password for security
                </p>
              </div>
              <Button onClick={handleShowPasswordModal} variant="secondary">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appearance Settings */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-xl)', fontWeight: '600' }}>Appearance</h2>
          <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
            Customize the look and feel of your interface
          </p>
        </div>

        <Card>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                  Theme
                </label>
                <FormSelect
                  value={formData.theme || 'light'}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'System' }
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                  Language
                </label>
                <FormSelect
                  value={formData.language || 'en'}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' }
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                  Timezone
                </label>
                <FormSelect
                  value={formData.timezone || 'UTC'}
                  onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'America/Chicago', label: 'Central Time' },
                    { value: 'America/Denver', label: 'Mountain Time' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time' }
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-xl)', fontWeight: '600' }}>Notifications</h2>
          <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
            Choose what notifications you want to receive
          </p>
        </div>

        <Card>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                    Email Notifications
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    Receive notifications via email
                  </p>
                </div>
                <FormCheckbox
                  label=""
                  checked={formData.emailNotifications ?? true}
                  onChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                    Push Notifications
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    Receive browser push notifications
                  </p>
                </div>
                <FormCheckbox
                  label=""
                  checked={formData.pushNotifications ?? true}
                  onChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                    Gauge Alerts
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    Get notified about gauge status changes
                  </p>
                </div>
                <FormCheckbox
                  label=""
                  checked={formData.gaugeAlerts ?? true}
                  onChange={(checked) => handlePreferenceChange('gaugeAlerts', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                    Maintenance Reminders
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    Receive reminders for gauge maintenance
                  </p>
                </div>
                <FormCheckbox
                  label=""
                  checked={formData.maintenanceReminders ?? true}
                  onChange={(checked) => handlePreferenceChange('maintenanceReminders', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--space-4) 0' }}>
        <Button
          onClick={handleSavePreferences}
          disabled={isUpdatingPreferences}
          size="lg"
        >
          {isUpdatingPreferences ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};