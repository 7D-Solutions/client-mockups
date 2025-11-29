// User module exports

// Components
export { PasswordModal } from '../../infrastructure/components';

// Context
export { UserProvider, useUser } from './context';

// Hooks
export { useUserProfile } from './hooks';

// Pages
export { UserProfile, UserSettings } from './pages';

// Routes
export { UserRoutes } from './routes';

// Services
export { userService } from './services';

// Types
export type {
  User,
  UserProfile as UserProfileType,
  UserPreferences,
  PasswordChangeData,
  UserActivity,
  UserSession,
  UserState,
  UpdateProfileData,
  UpdatePreferencesData,
  UserProfileResponse,
  UserPreferencesResponse,
  PasswordChangeResponse
} from './types';