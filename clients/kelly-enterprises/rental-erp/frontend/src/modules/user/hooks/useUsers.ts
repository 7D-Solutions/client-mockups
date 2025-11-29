import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../infrastructure/api/client';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: User[] }>('/users');
      return response.data; // Already filtered to active users on the backend
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false
  });
}