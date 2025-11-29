// useBadgeCounts hook - React Query integration for real-time badge counts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface BadgeCountsResponse {
  success: boolean;
  data: {
    // Gauge operations
    pendingQC: number;
    pendingUnseal: number;
    outOfService: number;
    calibrationDue: number;
    checkedOut: number;
    // Inventory
    lowStock: number;
    pendingOrders: number;
    // Dashboard
    myCheckouts: number;
    alerts: number;
  };
}

export const useBadgeCounts = () => {
  const { data, isLoading, error } = useQuery<BadgeCountsResponse>({
    queryKey: ['badge-counts'],
    queryFn: async () => {
      const response = await apiClient.get<BadgeCountsResponse>('/users/me/badge-counts');
      return response;
    },
    staleTime: 30000, // 30 seconds - badge counts don't change that frequently
    refetchInterval: 60000, // Refetch every minute for fresh counts
    refetchOnWindowFocus: true,
  });

  return {
    counts: data?.data || {
      pendingQC: 0,
      pendingUnseal: 0,
      outOfService: 0,
      calibrationDue: 0,
      checkedOut: 0,
      lowStock: 0,
      pendingOrders: 0,
      myCheckouts: 0,
      alerts: 0,
    },
    isLoading,
    error,
  };
};
