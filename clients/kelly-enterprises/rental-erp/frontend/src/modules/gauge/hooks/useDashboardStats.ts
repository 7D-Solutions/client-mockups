// Hook to fetch dashboard statistics
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api/client';

interface DashboardStats {
  total_active: number;
  available: number;
  checked_out: number;
  calibration_due: number;
  sealed_gauges: number;
  unsealed_gauges: number;
  scheduled_calibration: number;
  out_for_calibration: number;
  available_percentage: number;
  out_of_service: number;
}

export function useDashboardStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['gauges', 'dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: DashboardStats }>('/gauges/dashboard');
      return response.data;
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  return {
    stats: data || {
      total_active: 0,
      available: 0,
      checked_out: 0,
      calibration_due: 0,
      sealed_gauges: 0,
      unsealed_gauges: 0,
      scheduled_calibration: 0,
      out_for_calibration: 0,
      available_percentage: 0,
      out_of_service: 0,
    },
    isLoading,
    error,
  };
}