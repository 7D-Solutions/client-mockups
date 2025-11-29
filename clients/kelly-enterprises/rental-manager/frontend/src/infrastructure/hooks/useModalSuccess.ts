// Hook for handling modal success with synchronized toast/modal closing
import { useCallback, useRef } from 'react';
import { MODAL_SUCCESS_DURATION_MS } from '../constants/toast';
import { useSharedActions } from '../store';

interface UseModalSuccessProps {
  onClose: () => void;
}

export const useModalSuccess = ({ onClose }: UseModalSuccessProps) => {
  const { dismissAllActiveToasts } = useSharedActions();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleSuccess = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // After the duration, close both toast and modal simultaneously
    timeoutRef.current = setTimeout(() => {
      // Instantly dismiss all active toasts (no animation)
      dismissAllActiveToasts();
      // Close the modal at the same time
      onClose();
    }, MODAL_SUCCESS_DURATION_MS);
  }, [onClose, dismissAllActiveToasts]);

  return {
    handleSuccess,
    successDuration: MODAL_SUCCESS_DURATION_MS
  };
};