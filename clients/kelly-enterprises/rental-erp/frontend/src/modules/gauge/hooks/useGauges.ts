// Gauge data fetching hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gaugeService } from '../services';
import { useGaugeContext } from '../context';
import { useToast } from '../../../infrastructure';
import type { GaugeFilters, CheckoutData, ReturnData, TransferData } from '../types';

export const useGauges = (filters?: GaugeFilters) => {
  const { filters: contextFilters } = useGaugeContext();
  const activeFilters = filters || contextFilters;

  return useQuery({
    queryKey: ['gauges', activeFilters],
    queryFn: () => gaugeService.getAll(activeFilters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Keep showing previous data while fetching new data
  });
};

export const useGauge = (id: string) => {
  return useQuery({
    queryKey: ['gauge', id],
    queryFn: async () => {
      return await gaugeService.getById(id);
    },
    enabled: !!id,
    staleTime: 60000, // 1 minute
    retry: 2, // Only retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    onError: (error: any) => {
      console.error('❌ useGauge query error:', error);
    },
  });
};

export const useGaugeMutations = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { emitGaugeEvent } = useGaugeContext();

  const invalidateGauges = () => {
    queryClient.invalidateQueries({ queryKey: ['gauges'] });
    queryClient.invalidateQueries({ queryKey: ['gauge'] });
  };

  const checkout = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckoutData }) => 
      gaugeService.checkout(id, data),
    onSuccess: (response, variables) => {
      emitGaugeEvent('gauge:checked_out', { 
        gaugeId: variables.id, 
        gauge: response.data 
      });
      invalidateGauges();
    },
    onError: (error: Error) => {
      toast.error('Checkout Failed', error.message || 'Failed to checkout gauge');
    }
  });

  const returnGauge = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnData }) => 
      gaugeService.return(id, data),
    onSuccess: (response, variables) => {
      toast.success('Gauge Checked In', `Successfully checked in gauge ${variables.id}`);
      emitGaugeEvent('gauge:checked_in', { 
        gaugeId: variables.id, 
        gauge: response.data 
      });
      invalidateGauges();
    },
    onError: (error: Error) => {
      toast.error('Checkin Failed', error.message || 'Failed to checkin gauge');
    }
  });

  const transfer = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransferData }) => 
      gaugeService.transfer(id, data),
    onSuccess: (response, variables) => {
      toast.success('Gauge Transferred', `Successfully transferred gauge ${variables.id}`);
      emitGaugeEvent('gauge:transferred', { 
        gaugeId: variables.id, 
        gauge: response.data 
      });
      invalidateGauges();
    },
    onError: (error: Error) => {
      toast.error('Transfer Failed', error.message || 'Failed to transfer gauge');
    }
  });

  // Remove acceptReturn - replaced with qcVerify in useGaugeOperations

  return {
    checkout,
    returnGauge,
    transfer,
  };
};