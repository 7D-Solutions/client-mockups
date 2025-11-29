import { apiClient } from '../../../infrastructure/api/client';
import type { 
  UserProfile, 
  UserPreferences, 
  PasswordChangeData 
} from '../types';

export const userService = {
  // Profile management
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.request('/users/me');
    const userData = response.data || response;

    return {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      department: userData.department || '',
      position: userData.position || '',
      role: Array.isArray(userData.roles) ? userData.roles[0] : userData.role || 'User',
      createdAt: userData.createdAt || userData.created_at || new Date().toISOString(),
      updatedAt: userData.updatedAt || userData.updated_at || new Date().toISOString(),
      lastLogin: userData.lastLogin || userData.last_login
    };
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return response.data || response;
  },

  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    // Preferences are included in profile now
    const response = await apiClient.request('/users/me');
    const userData = response.data || response;
    return userData.preferences || {
      theme: 'light' as const,
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      pushNotifications: false,
      gaugeAlerts: true,
      maintenanceReminders: true,
      defaultView: 'list',
      itemsPerPage: 50
    };
  },

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await apiClient.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
    const userData = response.data || response;
    return userData.preferences;
  },

  // Security
  async changePassword(passwordData: PasswordChangeData): Promise<void> {
    return apiClient.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  },

  // Account management
  async deleteAccount(): Promise<void> {
    return apiClient.request('/user/account', {
      method: 'DELETE'
    });
  },

  async exportData(): Promise<Blob> {
    const response = await apiClient.request('/user/export', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    return new Blob([JSON.stringify(response, null, 2)], { 
      type: 'application/json' 
    });
  },

  // Activity and sessions
  async getActivity(): Promise<any[]> {
    return apiClient.request('/user/activity');
  },

  async getSessions(): Promise<any[]> {
    return apiClient.request('/user/sessions');
  },

  async revokeSession(sessionId: string): Promise<void> {
    return apiClient.request(`/user/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },

  async revokeAllSessions(): Promise<void> {
    return apiClient.request('/user/sessions', {
      method: 'DELETE'
    });
  }
};