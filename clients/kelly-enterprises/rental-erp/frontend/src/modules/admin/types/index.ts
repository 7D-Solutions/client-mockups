export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: number;
  module_id: string;
  resource: string;
  action: string;
  description: string;
}

export interface AdminState {
  loading: boolean;
  error: string | null;
  users: User[];
  roles: Role[];
  permissions: Permission[];
  currentView: string;
  selectedUser: User | null;
  selectedRole: Role | null;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roles?: string[];
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roles?: string[];
}

export interface CreateRoleData {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, string | number | boolean | null>;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  module: string;
  updatedBy: string;
  updatedAt: string;
}

// Organization Management Types
export interface Zone {
  id: number;
  code: string;
  name: string;
  buildingId: number;
  buildingName?: string;
  facilityName?: string;
  isActive: boolean;
  displayOrder: number;
  locationCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  facilityId: number;
  facilityName?: string;
  isActive: boolean;
  displayOrder: number;
  zoneCount: number;
  zones?: Zone[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Facility {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  buildingCount: number;
  buildings?: Building[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFacilityData {
  facility_code: string;
  facility_name: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateFacilityData {
  facility_code?: string;
  facility_name?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateBuildingData {
  building_code: string;
  building_name: string;
  facility_id: number;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateBuildingData {
  building_code?: string;
  building_name?: string;
  facility_id?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateZoneData {
  zone_code: string;
  zone_name: string;
  building_id: number;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateZoneData {
  zone_code?: string;
  zone_name?: string;
  building_id?: number;
  is_active?: boolean;
  display_order?: number;
}