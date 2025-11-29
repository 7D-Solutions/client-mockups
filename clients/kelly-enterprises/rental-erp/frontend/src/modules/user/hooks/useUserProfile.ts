import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../context';
import { logger } from '../../../infrastructure/utils/logger';
import { userService } from '../services/userService';
import { UserProfile, UserPreferences, PasswordChangeData } from '../types';

export const useUserProfile = () => {
  const queryClient = useQueryClient();
  const { emitUserEvent } = useUser();

  // Query for user profile
  const profileQuery = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userService.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for user preferences
  const preferencesQuery = useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: userService.getPreferences,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => userService.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['user', 'profile'], updatedProfile);
      emitUserEvent('user:profile:updated', updatedProfile);
    },
    onError: (error) => {
      logger.error('Failed to update profile:', error);
    }
  });

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) => userService.updatePreferences(data),
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['user', 'preferences'], updatedPreferences);
      emitUserEvent('user:preferences:updated', updatedPreferences);
    },
    onError: (error) => {
      logger.error('Failed to update preferences:', error);
    }
  });

  // Mutation for changing password
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordChangeData) => userService.changePassword(data),
    onSuccess: () => {
      emitUserEvent('user:password:changed', { timestamp: Date.now() });
    },
    onError: (error) => {
      logger.error('Failed to change password:', error);
    }
  });

  // Refresh profile data
  const refreshProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });
  };

  return {
    // Data
    profile: profileQuery.data,
    preferences: preferencesQuery.data,
    
    // Loading states
    isProfileLoading: profileQuery.isLoading,
    isPreferencesLoading: preferencesQuery.isLoading,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    
    // Error states
    profileError: profileQuery.error,
    preferencesError: preferencesQuery.error,
    updateProfileError: updateProfileMutation.error,
    updatePreferencesError: updatePreferencesMutation.error,
    changePasswordError: changePasswordMutation.error,
    
    // Actions
    updateProfile: updateProfileMutation.mutate,
    updatePreferences: updatePreferencesMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    refreshProfile,
    
    // Query utilities
    refetchProfile: profileQuery.refetch,
    refetchPreferences: preferencesQuery.refetch,
  };
};