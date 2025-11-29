// Centralized modal operations hook for consistent behavior across all modals
import { useCallback, useRef } from 'react';
import { useSharedActions } from '../store';
import { getModalConfig, MODAL_CONFIG } from '../config/modal';

/**
 * Modal operation strategy
 * - immediate: Close modal immediately after successful operation (prevents double-clicks)
 * - delayed: Close modal after a delay (allows users to see success state)
 * - manual: Don't auto-close, leave to caller to handle
 */
export type ModalCloseStrategy = 'immediate' | 'delayed' | 'manual';

interface UseModalOperationsProps {
  onClose: () => void;
  strategy?: ModalCloseStrategy;
  delayMs?: number; // Custom delay for 'delayed' strategy
  modalType?: keyof typeof MODAL_CONFIG.overrides; // Modal type for configuration lookup
}

/**
 * Centralized hook for modal operations
 * Provides consistent behavior across all modals in the application
 * 
 * Default strategy is 'immediate' to prevent double-click issues
 */
export const useModalOperations = ({ 
  onClose, 
  strategy,
  delayMs,
  modalType
}: UseModalOperationsProps) => {
  // Get configuration from centralized config
  const config = getModalConfig(modalType);
  const finalStrategy = strategy || config.strategy;
  const finalDelayMs = delayMs || config.delayMs;
  const { dismissAllActiveToasts } = useSharedActions();
  const timeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Handle successful operation completion
   * Behavior depends on the configured strategy
   */
  const handleSuccess = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    switch (finalStrategy) {
      case 'immediate':
        // Close modal immediately to prevent double-clicks
        onClose();
        break;
        
      case 'delayed':
        // Close modal after delay to show success state
        timeoutRef.current = setTimeout(() => {
          dismissAllActiveToasts();
          onClose();
        }, finalDelayMs);
        break;
        
      case 'manual':
        // Don't auto-close, caller handles closing
        break;
        
      default:
        // Fallback to immediate for safety
        onClose();
        break;
    }
  }, [onClose, finalStrategy, finalDelayMs, dismissAllActiveToasts]);

  /**
   * Handle operation error
   * Does not close modal, allows user to retry or cancel
   */
  const handleError = useCallback((error: any) => {
    console.error('Modal operation error:', error);
    // Error handling can be extended here if needed
    // For now, just log and leave modal open for user action
  }, []);

  /**
   * Close modal immediately (regardless of strategy)
   * Useful for cancel actions or forced closes
   */
  const closeImmediately = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  }, [onClose]);

  return {
    handleSuccess,
    handleError,
    closeImmediately,
    strategy: finalStrategy,
    delayMs: finalDelayMs
  };
};

/**
 * Convenience hooks for common modal patterns
 */

// For data-modifying operations where we want to prevent double-clicks
export const useImmediateModal = (props: Omit<UseModalOperationsProps, 'strategy'>) => 
  useModalOperations({ ...props, strategy: 'immediate' });

// For operations where we want to show success feedback
export const useDelayedModal = (props: Omit<UseModalOperationsProps, 'strategy'>) => 
  useModalOperations({ ...props, strategy: 'delayed' });

// For complex operations where caller controls closing
export const useManualModal = (props: Omit<UseModalOperationsProps, 'strategy'>) => 
  useModalOperations({ ...props, strategy: 'manual' });