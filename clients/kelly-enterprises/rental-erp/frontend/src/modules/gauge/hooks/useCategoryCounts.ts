// Hook to fetch category counts
import { useQuery } from '@tanstack/react-query';
import { gaugeService } from '../services';

export function useCategoryCounts() {
  // Fetch category counts directly from the dedicated endpoint
  const { data, isLoading, _error } = useQuery({
    queryKey: ['gauges', 'category-counts'],
    queryFn: () => gaugeService.getCategoryCounts(),
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const counts = {
    large: data?.data?.large || 0,
    company: data?.data?.company || 0,
    employee: data?.data?.employee || 0,
    thread: data?.data?.thread || 0,
    total: data?.data?.total || 0,
  };

  return {
    counts,
    isLoading,
  };
}