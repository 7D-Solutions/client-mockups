// Health Status component - for system monitoring
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api/client';
import { Icon } from '../../../infrastructure/components';
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  checks: {
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      connection: boolean;
    };
  };
}

export const HealthStatus = () => {
  // Fetch health status
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; } & HealthData>('/health');
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'running':
        return 'var(--color-success)';
      case 'degraded':
        return 'var(--color-warning)';
      case 'unhealthy':
      case 'disconnected':
      case 'stopped':
      case 'error':
        return 'var(--color-danger)';
      default:
        return 'var(--color-gray-500)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'running':
        return '✓';
      case 'degraded':
        return '!';
      case 'unhealthy':
      case 'disconnected':
      case 'stopped':
      case 'error':
        return '✗';
      default:
        return '?';
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
        <Icon name="spinner" spin />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
        <span style={{ color: 'var(--color-danger)', fontWeight: '500' }}>✗ Error</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
      <span style={{ color: getStatusColor(health.status), fontWeight: '500' }}>
        {getStatusIcon(health.status)} {TextFormatRules.capitalizeFirstLetter(health.status)}
      </span>
    </div>
  );
};
