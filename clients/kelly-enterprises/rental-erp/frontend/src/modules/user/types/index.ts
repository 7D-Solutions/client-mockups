// User profile and authentication related types
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role?: string;
  roles?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  gaugeAlerts: boolean;
  maintenanceReminders: boolean;
  defaultView?: string;
  itemsPerPage?: number;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password?: string;
}

export interface UserActivity {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

export interface UserState {
  profile: UserProfile | null;
  preferences: UserPreferences;
  isProfileLoading: boolean;
  activity: UserActivity[];
  sessions: UserSession[];
}

// Form data types
export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export interface UpdatePreferencesData {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  gaugeAlerts?: boolean;
  maintenanceReminders?: boolean;
  defaultView?: string;
  itemsPerPage?: number;
}

// API response types
export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
  message?: string;
}

export interface UserPreferencesResponse {
  success: boolean;
  data: UserPreferences;
  message?: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}