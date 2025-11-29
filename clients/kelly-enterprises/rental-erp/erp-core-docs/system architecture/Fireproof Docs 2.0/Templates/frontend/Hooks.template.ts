/**
 * HOOKS TEMPLATE
 *
 * This template provides standardized React Query hooks for data fetching and mutations.
 *
 * PATTERN OVERVIEW:
 * - React Query for server state management
 * - Consistent caching and refetching strategies
 * - Automatic error handling with toast notifications
 * - Query invalidation on mutations
 *
 * CUSTOMIZATION POINTS:
 * 1. Replace {{ENTITY_NAME}} with singular entity name (e.g., "Gauge", "User", "Order")
 * 2. Replace {{ENTITY_NAME_PLURAL}} with plural (e.g., "Gauges", "Users", "Orders")
 * 3. Replace {{ENTITY_NAME_LOWER}} with lowercase singular (e.g., "gauge", "user", "order")
 * 4. Replace {{ENTITY_NAME_LOWER_PLURAL}} with lowercase plural (e.g., "gauges", "users", "orders")
 * 5. Replace {{API_PREFIX}} with API endpoint prefix (e.g., "/gauges", "/users", "/orders")
 * 6. Add custom query/mutation hooks for specific operations
 *
 * HOOK TYPES:
 * - Query hooks: Fetch data (useEntities, useEntity)
 * - Mutation hooks: Modify data (useCreateEntity, useUpdateEntity, useDeleteEntity)
 *
 * @see useGauges.ts - Reference implementation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {{ENTITY_NAME_LOWER}}Service } from '../services';
import { useToast } from '../../../infrastructure';
import type { {{ENTITY_NAME}}Filters, {{ENTITY_NAME}}CreateData, {{ENTITY_NAME}}UpdateData } from '../types';

// ===== QUERY HOOKS =====

/**
 * Fetch list of {{ENTITY_NAME_LOWER_PLURAL}} with optional filters
 *
 * @param filters - Optional filters to apply
 * @returns React Query result with {{ENTITY_NAME_LOWER_PLURAL}} data
 *
 * @example
 * const { data, isLoading, error } = use{{ENTITY_NAME_PLURAL}}({ status: 'active' });
 * const {{ENTITY_NAME_LOWER_PLURAL}} = data?.data || [];
 */
export const use{{ENTITY_NAME_PLURAL}} = (filters?: {{ENTITY_NAME}}Filters) => {
  return useQuery({
    queryKey: ['{{ENTITY_NAME_LOWER_PLURAL}}', filters],
    queryFn: () => {{ENTITY_NAME_LOWER}}Service.getAll(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Keep showing previous data while fetching new data
  });
};

/**
 * Fetch single {{ENTITY_NAME_LOWER}} by ID
 *
 * @param id - {{ENTITY_NAME}} identifier
 * @returns React Query result with {{ENTITY_NAME_LOWER}} data
 *
 * @example
 * const { data: {{ENTITY_NAME_LOWER}}, isLoading } = use{{ENTITY_NAME}}('123');
 */
export const use{{ENTITY_NAME}} = (id: string) => {
  return useQuery({
    queryKey: ['{{ENTITY_NAME_LOWER}}', id],
    queryFn: async () => {
      return await {{ENTITY_NAME_LOWER}}Service.getById(id);
    },
    enabled: !!id, // Only fetch if ID is provided
    staleTime: 60000, // 1 minute
    retry: 2, // Only retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    onError: (error: any) => {
      console.error('❌ use{{ENTITY_NAME}} query error:', error);
    },
  });
};

// CUSTOMIZATION POINT: Add custom query hooks
/**
 * Example: Fetch {{ENTITY_NAME_LOWER_PLURAL}} by specific criteria
 *
 * @example
 * const { data } = use{{ENTITY_NAME_PLURAL}}ByStatus('active');
 */
export const use{{ENTITY_NAME_PLURAL}}ByStatus = (status: string) => {
  return useQuery({
    queryKey: ['{{ENTITY_NAME_LOWER_PLURAL}}', 'by-status', status],
    queryFn: () => {{ENTITY_NAME_LOWER}}Service.getAll({ status }),
    enabled: !!status,
    staleTime: 30000,
  });
};

// ===== MUTATION HOOKS =====

/**
 * Hook for {{ENTITY_NAME_LOWER}} mutations (create, update, delete)
 * Provides automatic query invalidation and error handling
 */
export const use{{ENTITY_NAME}}Mutations = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Helper to invalidate all {{ENTITY_NAME_LOWER}} queries
  const invalidate{{ENTITY_NAME_PLURAL}} = () => {
    queryClient.invalidateQueries({ queryKey: ['{{ENTITY_NAME_LOWER_PLURAL}}'] });
    queryClient.invalidateQueries({ queryKey: ['{{ENTITY_NAME_LOWER}}'] });
  };

  // Create mutation
  const create = useMutation({
    mutationFn: (data: {{ENTITY_NAME}}CreateData) =>
      {{ENTITY_NAME_LOWER}}Service.create(data),
    onSuccess: (response) => {
      toast.success('{{ENTITY_NAME}} Created', `Successfully created {{ENTITY_NAME_LOWER}}`);
      invalidate{{ENTITY_NAME_PLURAL}}();
    },
    onError: (error: Error) => {
      toast.error('Creation Failed', error.message || 'Failed to create {{ENTITY_NAME_LOWER}}');
    }
  });

  // Update mutation
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: {{ENTITY_NAME}}UpdateData }) =>
      {{ENTITY_NAME_LOWER}}Service.update(id, data),
    onSuccess: (response, variables) => {
      toast.success('{{ENTITY_NAME}} Updated', `Successfully updated {{ENTITY_NAME_LOWER}}`);
      invalidate{{ENTITY_NAME_PLURAL}}();
    },
    onError: (error: Error) => {
      toast.error('Update Failed', error.message || 'Failed to update {{ENTITY_NAME_LOWER}}');
    }
  });

  // Delete mutation
  const deleteEntity = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      {{ENTITY_NAME_LOWER}}Service.delete(id),
    onSuccess: (response, variables) => {
      toast.success('{{ENTITY_NAME}} Deleted', `Successfully deleted {{ENTITY_NAME_LOWER}}`);
      invalidate{{ENTITY_NAME_PLURAL}}();
    },
    onError: (error: Error) => {
      toast.error('Deletion Failed', error.message || 'Failed to delete {{ENTITY_NAME_LOWER}}');
    }
  });

  return {
    create,
    update,
    delete: deleteEntity,
  };
};

// ===== CUSTOM OPERATION HOOKS =====

// CUSTOMIZATION POINT: Add custom mutation hooks for specific operations
/**
 * Example: Hook for approving a {{ENTITY_NAME_LOWER}}
 *
 * @example
 * const { approve } = useApprove{{ENTITY_NAME}}();
 * await approve.mutateAsync({ id: '123', notes: 'Approved by QC' });
 */
export const useApprove{{ENTITY_NAME}} = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const approve = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      {{ENTITY_NAME_LOWER}}Service.approve(id, notes),
    onSuccess: (response) => {
      toast.success('{{ENTITY_NAME}} Approved', 'Successfully approved {{ENTITY_NAME_LOWER}}');
      queryClient.invalidateQueries({ queryKey: ['{{ENTITY_NAME_LOWER_PLURAL}}'] });
      queryClient.invalidateQueries({ queryKey: ['{{ENTITY_NAME_LOWER}}'] });
    },
    onError: (error: Error) => {
      toast.error('Approval Failed', error.message || 'Failed to approve {{ENTITY_NAME_LOWER}}');
    }
  });

  return { approve };
};

/**
 * Example: Hook for rejecting a {{ENTITY_NAME_LOWER}}
 *
 * @example
 * const { reject } = useReject{{ENTITY_NAME}}();
 * await reject.mutateAsync({ id: '123', reason: 'Does not meet requirements' });
 */
export const useReject{{ENTITY_NAME}} = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      {{ENTITY_NAME_LOWER}}Service.reject(id, reason),
    onSuccess: (response) => {
      toast.success('{{ENTITY_NAME}} Rejected', 'Successfully rejected {{ENTITY_NAME_LOWER}}');
      queryClient.invalidateQueries({ queryKey: ['{{ENTITY_NAME_LOWER_PLURAL}}'] });
      queryClient.invalidateQueries({ queryKey: ['{{ENTITY_NAME_LOWER}}'] });
    },
    onError: (error: Error) => {
      toast.error('Rejection Failed', error.message || 'Failed to reject {{ENTITY_NAME_LOWER}}');
    }
  });

  return { reject };
};

// CUSTOMIZATION POINT: Add more custom operation hooks as needed
// Examples: useAssign{{ENTITY_NAME}}, useArchive{{ENTITY_NAME}}, useBulkUpdate{{ENTITY_NAME_PLURAL}}, etc.
