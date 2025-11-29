// Gauge operations hook - business logic for gauge actions
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gaugeService } from '../services';
import { useToast } from '../../../infrastructure';
import { useGaugeContext } from '../context';
import { useAuth } from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { PermissionRules } from '../../../infrastructure/business/permissionRules';
// import { MODAL_SUCCESS_DURATION_MS } from '../../../infrastructure/constants/toast'; // Unused - using centralized modal operations
import type { CheckoutData, ReturnData, TransferData, Gauge } from '../types';
import type { APIError } from '../../../infrastructure/api/client';

export const useGaugeOperations = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { emitGaugeEvent } = useGaugeContext();
  const { user, permissions } = useAuth();

  const invalidateGauges = async (specificGaugeId?: string) => {
    // Invalidate all queries in parallel and wait for them
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['gauges'] }),
      queryClient.invalidateQueries({ queryKey: ['gauge'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-qc'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-alerts-stable', 'pending-qc'] }),
      queryClient.invalidateQueries({ queryKey: ['unseal-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-alerts-stable', 'unseal-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['badge-counts'] }), // Invalidate sidebar badge counts
      queryClient.invalidateQueries({ queryKey: ['my-gauges-counts'] }), // Invalidate My Gauges counts
      queryClient.invalidateQueries({ queryKey: ['gauges', 'category-counts'] }), // Invalidate category counts
      // Invalidate history for specific gauge or all gauges
      specificGaugeId
        ? queryClient.invalidateQueries({ queryKey: ['gauge-history', specificGaugeId] })
        : queryClient.invalidateQueries({ queryKey: ['gauge-history'] })
    ]);
  };

  // Checkout operation
  const checkoutMutation = useMutation({
    mutationFn: ({ gaugeId, data }: { gaugeId: string; data: CheckoutData }) =>
      gaugeService.checkout(gaugeId, data),
    onSuccess: async (response, { gaugeId }) => {
      toast.success('Success', 'Gauge checked out successfully', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:checked_out', {
        gaugeId,
        gauge: response.data,
        user: user?.id
      });
      await invalidateGauges(gaugeId);
    },
    onError: (error: APIError) => {
      // Handle specific error cases
      if (error.status === 409) {
        toast.error('Already Checked Out', error.message);
      } else if (error.status === 400 && (error.message?.includes('sealed') || error.data?.error === 'sealed_gauge')) {
        // Don't show toast for sealed gauges - let the modal handle it
        return;
      } else if (error.message?.includes('calibration due')) {
        toast.error('Calibration Due', 'This gauge cannot be checked out');
      } else {
        toast.error('Checkout Failed', error.message || 'Failed to checkout gauge');
      }
    }
  });

  // Return operation
  const returnMutation = useMutation({
    mutationFn: ({ gaugeId, data }: { gaugeId: string; data: ReturnData }) =>
      gaugeService.return(gaugeId, data),
    onSuccess: async (response, { gaugeId }) => {
      toast.success('Success', 'Gauge checked in successfully', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:checked_in', {
        gaugeId,
        gauge: response.data,
        user: user?.id
      });
      await invalidateGauges(gaugeId);
    },
    onError: (error: APIError) => {
      // Don't show toast for cross-user returns - let the modal handle it
      if (error.status === 400 && error.data?.requiresAcknowledgment) {
        return;
      }
      
      toast.error('Checkin Failed', error.message || 'Failed to checkin gauge');
    }
  });

  // Transfer operation
  const transferMutation = useMutation({
    mutationFn: ({ gaugeId, data }: { gaugeId: string; data: TransferData }) =>
      gaugeService.transfer(gaugeId, data),
    onSuccess: async (response, { gaugeId }) => {
      toast.success('Success', 'Gauge transferred successfully', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:transferred', {
        gaugeId,
        gauge: response.data,
        user: user?.id
      });
      await invalidateGauges(gaugeId);
    },
    onError: (error: APIError) => {
      if (error.message?.includes('not holder')) {
        toast.error('Transfer Denied', 'Only the current holder can transfer this gauge');
      } else {
        toast.error('Transfer Failed', error.message || 'Failed to transfer gauge');
      }
    }
  });

  // Cancel transfer operation
  const cancelTransferMutation = useMutation({
    mutationFn: ({ transferId, reason }: { transferId: string | number; reason?: string }) =>
      gaugeService.cancelTransfer(transferId, reason),
    onSuccess: async () => {
      toast.success('Transfer Cancelled', 'Transfer request has been cancelled', 0); // 0 = no auto-dismiss
      await invalidateGauges();
    },
    onError: (error: APIError) => {
      toast.error('Cancel Failed', error.message || 'Failed to cancel transfer');
    }
  });

  // QC Verify operation
  const qcVerifyMutation = useMutation({
    mutationFn: ({ gaugeId, data }: { gaugeId: string; data: { pass_fail: 'pass' | 'fail'; condition_rating: number; notes?: string; requires_calibration: boolean } }) =>
      gaugeService.verifyQC(gaugeId, data),
    onSuccess: async (response, { gaugeId, data }) => {
      const message = data.pass_fail === 'pass' 
        ? 'Gauge approved successfully' 
        : 'Gauge rejected and marked for calibration';
      toast.success('QC Complete', message, 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:qc_verified', {
        gaugeId,
        gauge: response.data,
        result: data.pass_fail,
        user: user?.id
      });
      await invalidateGauges(gaugeId);
    },
    onError: (error: APIError) => {
      toast.error('QC Verification Failed', error.message || 'Failed to verify gauge');
    }
  });

  // Unseal request operation
  const unsealRequestMutation = useMutation({
    mutationFn: ({ gaugeId, reason }: { gaugeId: string; reason: string }) =>
      gaugeService.createUnsealRequest(gaugeId, reason),
    onSuccess: async (response, { gaugeId }) => {
      toast.success('Request Submitted', 'Unseal request submitted for review', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:unseal_requested', {
        gaugeId,
        request: response.data,
        user: user?.id
      });
      await invalidateGauges(gaugeId);
    },
    onError: (error: APIError) => {
      toast.error('Request Failed', error.message || 'Failed to submit unseal request');
    }
  });

  // Send to calibration
  const sendToCalibrationMutation = useMutation({
    mutationFn: (gaugeIds: string[]) =>
      gaugeService.sendToCalibration(gaugeIds),
    onSuccess: async (_, gaugeIds) => {
      toast.success('Success', `${gaugeIds.length} gauge(s) sent to calibration`, 0); // 0 = no auto-dismiss
      gaugeIds.forEach(gaugeId => {
        emitGaugeEvent('gauge:sent_to_calibration', {
          gaugeId,
          user: user?.id
        });
      });
      await invalidateGauges();
    },
    onError: (error: APIError) => {
      toast.error('Calibration Failed', error.message || 'Failed to send to calibration');
    }
  });

  // Approve unseal request
  const approveUnsealMutation = useMutation({
    mutationFn: (requestId: string) =>
      gaugeService.approveUnsealRequest(requestId),
    onSuccess: async (response, requestId) => {
      toast.success('Success', 'Unseal request approved', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:unseal_approved', {
        requestId,
        request: response.data,
        user: user?.id
      });
      await invalidateGauges();
    },
    onError: (error: APIError) => {
      toast.error('Approval Failed', error.message || 'Failed to approve unseal request');
    }
  });

  // Deny unseal request
  const denyUnsealMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      gaugeService.denyUnsealRequest(requestId, reason),
    onSuccess: async (response, { requestId }) => {
      toast.success('Success', 'Unseal request denied', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:unseal_denied', {
        requestId,
        request: response.data,
        user: user?.id
      });
      await invalidateGauges();
    },
    onError: (error: APIError) => {
      toast.error('Denial Failed', error.message || 'Failed to deny unseal request');
    }
  });

  // Confirm physical unseal
  const confirmUnsealMutation = useMutation({
    mutationFn: (requestId: string) =>
      gaugeService.confirmUnseal(requestId),
    onSuccess: async (response, requestId) => {
      toast.success('Success', 'Gauge has been unsealed', 0); // 0 = no auto-dismiss
      emitGaugeEvent('gauge:physically_unsealed', {
        requestId,
        request: response.data,
        user: user?.id
      });
      await invalidateGauges();
    },
    onError: (error: APIError) => {
      toast.error('Unseal Failed', error.message || 'Failed to confirm unseal');
    }
  });

  // Helper functions for business logic
  const canCheckout = (gauge: Gauge | null) => {
    if (!gauge) return false;

    // Use centralized business rules for equipment checkout eligibility
    if (!EquipmentRules.canBeCheckedOut(gauge)) {
      return false;
    }

    // Don't allow checkout if calibration is due
    if (StatusRules.isCalibrationDueStatus(gauge)) {
      return false;
    }

    // Allow checkout attempt for sealed gauges - will trigger unseal request flow
    if (StatusRules.isSealed(gauge)) {
      return true;
    }

    // For non-sealed gauges, check if available
    return StatusRules.isAvailable(gauge);
  };

  const canReturn = (gauge: Gauge | null) => {
    if (!gauge || !user) return false;
    return StatusRules.isCheckedOut(gauge);
  };

  const canTransfer = (gauge: Gauge | null) => {
    if (!gauge || !user) return false;

    // Check if current user is the holder (check both holder object and checked_out_to field)
    const isCurrentUserHolder =
      gauge.holder?.id === user.id ||
      gauge.checked_out_to === user.id ||
      String(gauge.checked_out_to) === String(user.id);

    return StatusRules.isCheckedOut(gauge) && isCurrentUserHolder;
  };

  const canAcceptReturn = (gauge: Gauge | null) => {
    return PermissionRules.canAcceptReturn(permissions || [], gauge);
  };

  const canRequestUnseal = (gauge: Gauge | null) => {
    if (!gauge) return false;
    return StatusRules.isSealed(gauge) && !StatusRules.isAtCalibration(gauge);
  };

  const canSendToCalibration = () => {
    return PermissionRules.canManageCalibration(permissions || []);
  };

  return {
    // Mutations
    checkout: checkoutMutation,
    return: returnMutation,
    transfer: transferMutation,
    cancelTransfer: cancelTransferMutation,
    qcVerify: qcVerifyMutation,
    requestUnseal: unsealRequestMutation,
    sendToCalibration: sendToCalibrationMutation,
    approveUnseal: approveUnsealMutation,
    denyUnseal: denyUnsealMutation,
    confirmUnseal: confirmUnsealMutation,
    
    // Business logic helpers
    canCheckout,
    canReturn,
    canTransfer,
    canAcceptReturn,
    canRequestUnseal,
    canSendToCalibration,
  };
};