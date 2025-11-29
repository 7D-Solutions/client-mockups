import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gaugeService } from '../services';
import { useToast } from '../../../infrastructure';
import { logger } from '../../../infrastructure/utils/logger';

// Query for fetching categories by equipment type
export const useGaugeCategoriesQuery = (equipmentType: string) => {
  return useQuery({
    queryKey: ['gauge-categories', equipmentType],
    queryFn: () => gaugeService.getCategoriesByEquipmentType(equipmentType),
    enabled: !!equipmentType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation for creating a single gauge
export const useCreateGaugeMutation = () => {
  const queryClient = useQueryClient();
  const _toast = useToast();

  return useMutation({
    mutationFn: async (data: { gaugeData?: any; goData?: any; noGoData?: any }) => {
      // Handle gauge set creation
      if (data.goData && data.noGoData) {
        return await gaugeService.createGaugeSet(data.goData, data.noGoData);
      }
      // Handle single gauge creation
      return await gaugeService.createGauge(data.gaugeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
      queryClient.invalidateQueries({ queryKey: ['gauge-inventory'] });
    },
    onError: (error) => {
      logger.error('❌ Mutation error:', error);
      logger.error('❌ Mutation error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    },
  });
};

// Query for fetching spare gauges
export const useSparesQuery = (filters?: any) => {
  return useQuery({
    queryKey: ['gauges', 'spares', filters],
    queryFn: () => gaugeService.getSpares(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Query for fetching gauge history
export const useGaugeHistory = (gaugeId: string | undefined) => {
  return useQuery({
    queryKey: ['gauge-history', gaugeId],
    queryFn: () => gaugeService.getGaugeHistory(gaugeId!),
    enabled: !!gaugeId,
    staleTime: 60 * 1000, // 1 minute
  });
};