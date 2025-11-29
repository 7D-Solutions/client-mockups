// useFavorites hook - React Query + Zustand integration for favorites management
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useNavigationActions, useNavigationState } from '../../store';
import { useSharedActions } from '../../store';

interface FavoritesResponse {
  success: boolean;
  data: string[];
}

interface FavoriteActionResponse {
  success: boolean;
  data: {
    item_id: string;
    position?: number;
    message?: string;
  };
}

interface ReorderResponse {
  success: boolean;
  data: {
    order: string[];
  };
}

export const useFavorites = () => {
  const queryClient = useQueryClient();
  const { setNavigationFavorites, addNavigationFavorite, removeNavigationFavorite, reorderNavigationFavorites } = useNavigationActions();
  const { favorites } = useNavigationState();
  const { addNotification } = useSharedActions();

  // Fetch favorites from server
  const { data, isLoading, error } = useQuery<FavoritesResponse>({
    queryKey: ['user-favorites'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<FavoritesResponse>('/users/me/favorites');
        return response;
      } catch (err: any) {
        // If 400 error (likely no favorites yet), return empty array
        if (err?.response?.status === 400) {
          return { success: true, data: [] };
        }
        throw err;
      }
    },
    staleTime: 5000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Sync server state to Zustand when data changes (using useEffect to avoid setState during render)
  useEffect(() => {
    if (data?.success && data.data) {
      const serverFavorites = data.data;
      const currentFavorites = favorites;

      // Only update if different to avoid unnecessary re-renders
      if (JSON.stringify(serverFavorites) !== JSON.stringify(currentFavorites)) {
        setNavigationFavorites(serverFavorites);
      }
    }
  }, [data, favorites, setNavigationFavorites]);

  // Add favorite mutation
  const addMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiClient.post<FavoriteActionResponse>('/users/me/favorites', {
        itemId,
      });
      return response;
    },
    onMutate: async (itemId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-favorites'] });

      // Snapshot previous value
      const previousFavorites = favorites;

      // Optimistic update via Zustand
      addNavigationFavorite(itemId);

      // Return context for rollback
      return { previousFavorites };
    },
    onError: (err: any, itemId, context) => {
      // Rollback via Zustand
      if (context?.previousFavorites) {
        setNavigationFavorites(context.previousFavorites);
      }

      // Show error toast
      addNotification({
        type: 'error',
        title: 'Failed to add favorite',
        message: err?.message || 'Please try again',
        duration: 3000,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  // Remove favorite mutation
  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiClient.delete<FavoriteActionResponse>(`/users/me/favorites/${itemId}`);
      return response;
    },
    onMutate: async (itemId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-favorites'] });

      // Snapshot previous value
      const previousFavorites = favorites;

      // Optimistic update via Zustand
      removeNavigationFavorite(itemId);

      // Return context for rollback
      return { previousFavorites };
    },
    onError: (err: any, itemId, context) => {
      // Rollback via Zustand
      if (context?.previousFavorites) {
        setNavigationFavorites(context.previousFavorites);
      }

      // Show error toast
      addNotification({
        type: 'error',
        title: 'Failed to remove favorite',
        message: err?.message || 'Please try again',
        duration: 3000,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  // Reorder favorites mutation
  const reorderMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const response = await apiClient.put<ReorderResponse>('/users/me/favorites/reorder', {
        order,
      });
      return response;
    },
    onMutate: async (order) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-favorites'] });

      // Snapshot previous value
      const previousFavorites = favorites;

      // Optimistic update via Zustand
      reorderNavigationFavorites(order);

      // Return context for rollback
      return { previousFavorites };
    },
    onError: (err: any, order, context) => {
      // Rollback via Zustand
      if (context?.previousFavorites) {
        setNavigationFavorites(context.previousFavorites);
      }

      // Show error toast
      addNotification({
        type: 'error',
        title: 'Failed to reorder favorites',
        message: err?.message || 'Please try again',
        duration: 3000,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  return {
    favorites,
    isLoading,
    error,
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    reorderFavorites: reorderMutation.mutate,
    isAddingFavorite: addMutation.isPending,
    isRemovingFavorite: removeMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
};
