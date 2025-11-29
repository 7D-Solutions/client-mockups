// For Claude: Use apiClient instead of direct fetch() calls for all HTTP requests
// This provides automatic authentication, error handling, and consistent patterns
import { apiClient } from '../../../infrastructure/api/client';
import type {
  User,
  Role,
  Permission,
  CreateUserData,
  UpdateUserData,
  CreateRoleData,
  UpdateRoleData,
  AuditLog,
  SystemSettings,
  Facility,
  Building,
  Zone,
  CreateFacilityData,
  UpdateFacilityData,
  CreateBuildingData,
  UpdateBuildingData,
  CreateZoneData,
  UpdateZoneData
} from '../types';

export const adminService = {
  // User management
  async getUsers(page: number = 1, limit: number = 50, search?: string, sortBy?: string, sortOrder?: string): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) {
      params.append('search', search);
    }
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    if (sortOrder) {
      params.append('sortOrder', sortOrder);
    }
    const response = await apiClient.request(`/admin/users?${params.toString()}`);
    // Handle both old and new response formats
    if (response.data && response.data.users) {
      return response.data;
    }
    // New standardized format
    return {
      users: response.data || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || page,
      totalPages: response.pagination?.totalPages || 1
    };
  },

  async getUserById(id: string): Promise<User> {
    return apiClient.request(`/admin/users/${id}`);
  },

  async createUser(userData: CreateUserData): Promise<User> {
    const response: any = await apiClient.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    // Backend returns { success: true, data: user }
    return response.data || response;
  },

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const response: any = await apiClient.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    // Backend returns { success: true, data: user }
    return response.data || response;
  },

  async deleteUser(id: string): Promise<void> {
    return apiClient.request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  async activateUser(id: string): Promise<User> {
    return apiClient.request(`/admin/users/${id}/activate`, {
      method: 'POST'
    });
  },

  async deactivateUser(id: string): Promise<User> {
    return apiClient.request(`/admin/users/${id}/deactivate`, {
      method: 'POST'
    });
  },

  async resetUserPassword(id: string, password?: string): Promise<{ temporaryPassword: string }> {
    return apiClient.request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: password ? JSON.stringify({ password }) : undefined
    });
  },

  // Role management
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.request('/admin/roles');
    return response.data;
  },

  async getRoleById(id: string): Promise<Role> {
    return apiClient.request(`/admin/roles/${id}`);
  },

  async createRole(roleData: CreateRoleData): Promise<Role> {
    return apiClient.request('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData)
    });
  },

  async updateRole(id: string, roleData: UpdateRoleData): Promise<Role> {
    return apiClient.request(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    });
  },

  async deleteRole(id: string): Promise<void> {
    return apiClient.request(`/admin/roles/${id}`, {
      method: 'DELETE'
    });
  },

  // Permission management
  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.request('/admin/permissions');
    return response.data;
  },

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const response = await apiClient.request(`/admin/permissions/users/${userId}`);
    return response.data;
  },

  async grantPermission(userId: string, permissionId: number): Promise<void> {
    return apiClient.request(`/admin/permissions/users/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ permissionId })
    });
  },

  async grantPermissionsBulk(userId: string, permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) return;
    return apiClient.request(`/admin/permissions/users/${userId}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ permissionIds })
    });
  },

  async revokePermission(userId: string, permissionId: number): Promise<void> {
    return apiClient.request(`/admin/permissions/users/${userId}/${permissionId}`, {
      method: 'DELETE'
    });
  },

  async revokePermissionsBulk(userId: string, permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) return;
    return apiClient.request(`/admin/permissions/users/${userId}/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({ permissionIds })
    });
  },

  async applyRoleTemplate(userId: string, roleName: string): Promise<void> {
    return apiClient.request(`/admin/permissions/users/${userId}/apply-role-template`, {
      method: 'POST',
      body: JSON.stringify({ roleName })
    });
  },

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    return apiClient.request(`/admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleId })
    });
  },

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return apiClient.request(`/admin/users/${userId}/roles/${roleId}`, {
      method: 'DELETE'
    });
  },

  // Audit logs
  async getAuditLogs(params?: {
    userId?: string;
    action?: string;
    resource?: string;
    gaugeId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    return apiClient.request(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  },

  // System settings
  async getSystemSettings(): Promise<SystemSettings[]> {
    return apiClient.request('/admin/system-settings');
  },

  async updateSystemSetting(key: string, value: string): Promise<SystemSettings> {
    return apiClient.request(`/admin/system-settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  },

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    return apiClient.request('/admin/stats');
  },

  // System maintenance tools (Phase 3: Connect orphaned endpoints)
  async getGaugeStatusReport(): Promise<any> {
    return apiClient.request('/admin/maintenance/gauge-status-report');
  },

  async updateGaugeStatuses(options?: { force?: boolean; dryRun?: boolean; limit?: number }): Promise<any> {
    return apiClient.request('/admin/maintenance/update-statuses', {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  },

  async getStatusInconsistencies(): Promise<any> {
    return apiClient.request('/admin/maintenance/status-inconsistencies');
  },

  async seedTestData(options?: { count?: number; type?: 'gauges' | 'users' | 'all'; reset?: boolean }): Promise<any> {
    return apiClient.request('/admin/maintenance/seed-test-data', {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  },

  async getSystemUsers(): Promise<any> {
    return apiClient.request('/admin/maintenance/system-users');
  },

  // System recovery tools (Phase 3: Connect orphaned endpoints)
  async getGaugeRecoveryInfo(gaugeId: string): Promise<any> {
    return apiClient.request(`/admin/system-recovery/gauge/${gaugeId}`);
  },

  async executeGaugeRecovery(gaugeId: string, action: string, force?: boolean): Promise<any> {
    return apiClient.request(`/admin/system-recovery/gauge/${gaugeId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ action, force })
    });
  },

  // Organization Management
  async getOrganizationHierarchy(): Promise<Facility[]> {
    const response = await apiClient.request('/admin/organization/hierarchy');
    return response.data;
  },

  // Facility management
  async getFacilities(): Promise<Facility[]> {
    const response = await apiClient.request('/admin/organization/facilities');
    return response.data;
  },

  async createFacility(data: CreateFacilityData): Promise<Facility> {
    const response = await apiClient.request('/admin/organization/facilities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  },

  async updateFacility(id: number, data: UpdateFacilityData): Promise<Facility> {
    const response = await apiClient.request(`/admin/organization/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data;
  },

  async deleteFacility(id: number): Promise<void> {
    return apiClient.request(`/admin/organization/facilities/${id}`, {
      method: 'DELETE'
    });
  },

  // Building management
  async getBuildings(facilityId?: number): Promise<Building[]> {
    const url = facilityId
      ? `/admin/organization/buildings?facility_id=${facilityId}`
      : '/admin/organization/buildings';
    const response = await apiClient.request(url);
    return response.data;
  },

  async createBuilding(data: CreateBuildingData): Promise<Building> {
    const response = await apiClient.request('/admin/organization/buildings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  },

  async updateBuilding(id: number, data: UpdateBuildingData): Promise<Building> {
    const response = await apiClient.request(`/admin/organization/buildings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data;
  },

  async deleteBuilding(id: number): Promise<void> {
    return apiClient.request(`/admin/organization/buildings/${id}`, {
      method: 'DELETE'
    });
  },

  // Zone management
  async getZones(buildingId?: number): Promise<Zone[]> {
    const url = buildingId
      ? `/admin/organization/zones?building_id=${buildingId}`
      : '/admin/organization/zones';
    const response = await apiClient.request(url);
    return response.data;
  },

  async createZone(data: CreateZoneData): Promise<Zone> {
    const response = await apiClient.request('/admin/organization/zones', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  },

  async updateZone(id: number, data: UpdateZoneData): Promise<Zone> {
    const response = await apiClient.request(`/admin/organization/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data;
  },

  async deleteZone(id: number): Promise<void> {
    return apiClient.request(`/admin/organization/zones/${id}`, {
      method: 'DELETE'
    });
  }
};

export default adminService;