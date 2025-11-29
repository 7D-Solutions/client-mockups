// Hook for admin alerts data
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gaugeService } from '../services';
import { eventBus } from '../../../infrastructure/events';
import { getGroupedGaugeCount } from '../utils/gaugeGrouping';

export const useAdminAlerts = () => {
  const _queryClient = useQueryClient();
  // Get pending QC count - use same endpoint as modal for consistency
  const {
    data: pendingQCData,
    isLoading: isQCLoading,
    error: qcError,
    refetch: refetchPendingQC
  } = useQuery({
    queryKey: ['admin-alerts-stable', 'pending-qc'],
    queryFn: () => gaugeService.getAll({ status: 'pending_qc' }),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always consider data stale for immediate updates
  });

  // Get out of service gauges count
  const {
    data: outOfServiceData,
    isLoading: isOutOfServiceLoading,
    error: outOfServiceError,
    refetch: _refetchOutOfService
  } = useQuery({
    queryKey: ['admin-alerts-stable', 'out-of-service'],
    queryFn: () => gaugeService.getAll({ status: 'out_of_service' }),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always consider data stale for immediate updates
  });

  // Get pending unseal requests count
  const { 
    data: pendingUnsealData,
    isLoading: isPendingUnsealLoading,
    error: pendingUnsealError 
  } = useQuery({
    queryKey: ['admin-alerts-stable', 'unseal-requests', 'pending'],
    queryFn: () => gaugeService.getUnsealRequests('pending'),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always consider data stale for immediate updates
  });

  // Get approved unseal requests count
  const {
    data: approvedUnsealData,
    isLoading: isApprovedUnsealLoading,
    error: approvedUnsealError
  } = useQuery({
    queryKey: ['admin-alerts-stable', 'unseal-requests', 'approved'],
    queryFn: () => gaugeService.getUnsealRequests('approved'),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always consider data stale for immediate updates
  });

  // Get calibration due count
  const {
    data: calibrationDueData,
    isLoading: isCalibrationDueLoading,
    error: calibrationDueError
  } = useQuery({
    queryKey: ['admin-alerts-stable', 'calibration-due'],
    queryFn: () => gaugeService.getAll({ status: 'calibration_due' }),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always consider data stale for immediate updates
  });

  // Use shared grouping logic to match modal display
  const pendingQCCount = getGroupedGaugeCount(pendingQCData?.data);

  const pendingCount = pendingUnsealData?.data?.length || 0;
  const approvedCount = approvedUnsealData?.data?.length || 0;
  const pendingUnsealCount = pendingCount + approvedCount;
  const outOfServiceCount = outOfServiceData?.data?.length || 0;
  const calibrationDueCount = calibrationDueData?.data?.length || 0;

  const isLoading = isQCLoading || isPendingUnsealLoading || isApprovedUnsealLoading || isOutOfServiceLoading || isCalibrationDueLoading;
  const hasError = qcError || pendingUnsealError || approvedUnsealError || outOfServiceError || calibrationDueError;

  // Listen for gauge events and refresh pending QC count
  useEffect(() => {
    const handleGaugeCheckedIn = () => {
      // Directly refetch instead of just invalidating
      refetchPendingQC();
    };
    
    const handleGaugeQCVerified = () => {
      // QC was approved/rejected, refresh the count
      refetchPendingQC();
    };

    eventBus.on('gauge:checked_in', handleGaugeCheckedIn);
    eventBus.on('gauge:qc_verified', handleGaugeQCVerified);
    
    return () => {
      eventBus.off('gauge:checked_in', handleGaugeCheckedIn);
      eventBus.off('gauge:qc_verified', handleGaugeQCVerified);
    };
  }, [refetchPendingQC]);

  return {
    pendingQCCount,
    pendingUnsealCount,
    outOfServiceCount,
    calibrationDueCount,
    isLoading,
    hasError,
    // For backward compatibility, also return the data
    pendingQCItems: pendingQCData?.data || [],
    pendingUnsealRequests: [...(pendingUnsealData?.data || []), ...(approvedUnsealData?.data || [])],
    outOfServiceItems: outOfServiceData?.data || [],
    calibrationDueItems: calibrationDueData?.data || [],
  };
};