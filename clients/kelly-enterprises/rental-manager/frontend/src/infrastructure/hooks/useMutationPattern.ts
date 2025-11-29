// Standardized mutation pattern for consistent error handling and loading states
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';
import type { APIError } from '../api/client';

interface MutationConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: APIError, variables: TVariables) => void;
  invalidateQueries?: string[][];
  successToast?: {
    title: string;
    message: string;
    autoDismiss?: boolean;
  };
  errorToast?: {
    title: string;
    defaultMessage?: string;
  };
}

/**
 * Standardized mutation hook that enforces consistent patterns:
 * - Consistent error handling with user-friendly messages
 * - Automatic query invalidation
 * - Standardized success/error toasts
 * - Proper loading states
 * - Centralized error logging
 */
export function useMutationPattern<TData = unknown, TVariables = void>(
  config: MutationConfig<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<TData, APIError, TVariables>({
    mutationFn: config.mutationFn,
    onSuccess: async (data, variables) => {
      // Show success toast if configured
      if (config.successToast) {
        const autoDismiss = config.successToast.autoDismiss !== false;
        toast.success(
          config.successToast.title,
          config.successToast.message,
          autoDismiss ? undefined : 0
        );
      }

      // Invalidate queries if specified
      if (config.invalidateQueries) {
        await Promise.all(
          config.invalidateQueries.map(queryKey =>
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }

      // Call custom success handler if provided
      if (config.onSuccess) {
        await config.onSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      // Log error for debugging
      logger.error('Mutation error:', error, 'Variables:', variables);

      // Show error toast if configured
      if (config.errorToast) {
        const message = error.message || config.errorToast.defaultMessage || 'Operation failed';
        toast.error(config.errorToast.title, message);
      }

      // Call custom error handler if provided
      if (config.onError) {
        config.onError(error, variables);
      }
    }
  });
}

/**
 * Simplified mutation hook for operations that don't need complex configuration
 */
export function useSimpleMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  } = {}
) {
  return useMutationPattern({
    mutationFn,
    successToast: options.successMessage ? {
      title: 'Success',
      message: options.successMessage
    } : undefined,
    errorToast: options.errorMessage ? {
      title: 'Error',
      defaultMessage: options.errorMessage
    } : undefined,
    invalidateQueries: options.invalidateQueries
  });
}

/**
 * Async mutation wrapper that provides consistent error handling for async operations
 */
export function useAsyncMutation<TData = unknown, TVariables = void>(
  config: MutationConfig<TData, TVariables>
) {
  const mutation = useMutationPattern(config);

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    return await mutation.mutateAsync(variables);
  };

  return {
    ...mutation,
    mutateAsync
  };
}