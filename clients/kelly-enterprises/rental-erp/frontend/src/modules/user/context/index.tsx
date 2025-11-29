import React, { createContext, useContext, ReactNode } from 'react';
import { eventBus, useEventBus, EVENTS } from '../../../infrastructure/events';
import { useUserState, useUserActions } from '../../../infrastructure/store';
import { UserProfile, UserPreferences, PasswordChangeData } from '../types';
import { userService } from '../services/userService';

interface UserContextValue {
  // State from Zustand store
  profile: UserProfile | null;
  preferences: UserPreferences;
  isProfileLoading: boolean;
  
  // Actions from Zustand store
  setProfile: (profile: UserProfile | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setProfileLoading: (loading: boolean) => void;
  
  // Business logic actions
  loadProfile: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  changePassword: (passwordData: PasswordChangeData) => Promise<void>;
  savePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  
  // Event emitters
  emitUserEvent: (event: string, data: any) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const userState = useUserState();
  const userActions = useUserActions();

  // Listen to user events
  useEventBus(EVENTS.USER_LOGGED_IN, (_data) => {
    // Load user profile when logged in
    loadProfile();
  });

  useEventBus(EVENTS.USER_PERMISSIONS_CHANGED, (_data) => {
    // Refresh user profile when permissions change
    loadProfile();
  });

  // Event emitter function
  const emitUserEvent = (event: string, data: any) => {
    eventBus.emit(event, data);
  };

  // Profile management actions
  const loadProfile = async () => {
    try {
      userActions.setProfileLoading(true);
      const profile = await userService.getProfile();
      userActions.setProfile(profile);
      eventBus.emit('user:profile:loaded', profile);
    } catch (_error: any) {
      // Error handling - profile load failed
      userActions.setProfile(null);
    } finally {
      userActions.setProfileLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    const updatedProfile = await userService.updateProfile(profileData);
    userActions.setProfile(updatedProfile);
    eventBus.emit('user:profile:updated', updatedProfile);
    emitUserEvent(EVENTS.USER_PERMISSIONS_CHANGED, { userId: updatedProfile.id });
  };

  const changePassword = async (passwordData: PasswordChangeData) => {
    await userService.changePassword(passwordData);
    eventBus.emit('user:password:changed', { userId: (userState.profile as any)?.id });
    // Note: Password change typically forces logout for security
  };

  const savePreferences = async (preferences: Partial<UserPreferences>) => {
    const updatedPreferences = await userService.updatePreferences(preferences);
    userActions.updatePreferences(updatedPreferences);
    eventBus.emit('user:preferences:updated', updatedPreferences);
  };

  const value: UserContextValue = {
    // State from Zustand store
    profile: userState.profile,
    preferences: userState.preferences as UserPreferences,
    isProfileLoading: userState.isProfileLoading,
    
    // Actions from Zustand store
    setProfile: userActions.setProfile,
    updatePreferences: userActions.updatePreferences,
    setProfileLoading: userActions.setProfileLoading,
    
    // Business logic actions
    loadProfile,
    updateProfile,
    changePassword,
    savePreferences,
    
    // Event emitter
    emitUserEvent,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};