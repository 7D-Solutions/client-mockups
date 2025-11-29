// Shared Toast notification component
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import styles from './Toast.module.css';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  icon?: ReactNode;
}

interface ToastProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

const ToastComponent = ({ toast, onRemove }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // If duration is 0 or negative, don't auto-dismiss
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 300); // Wait for animation
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  const typeClass = styles[toast.type];
  const iconClass = {
    success: styles.iconSuccess,
    error: styles.iconError,
    warning: styles.iconWarning,
    info: styles.iconInfo,
  }[toast.type];

  const defaultIcons = {
    success: (
      <svg className={styles.icon} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className={styles.icon} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className={styles.icon} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className={styles.icon} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`${styles.toastWrapper} ${typeClass} ${isVisible ? styles.visible : styles.hidden}`}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={`${styles.iconWrapper} ${iconClass}`}>
            {toast.icon || defaultIcons[toast.type]}
          </div>
          <div className={styles.body}>
            <p className={styles.title}>{toast.title}</p>
            {toast.message && (
              <p className={styles.message}>{toast.message}</p>
            )}
          </div>
          <div className={styles.closeWrapper}>
            <Button
              onClick={() => onRemove(toast.id)}
              className={styles.closeButton}
              variant="ghost"
              size="sm"
              aria-label="Close notification"
            >
              <span className={styles.srOnly}>Close</span>
              <svg className={styles.icon} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Container
interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className={styles.toastContainer}>
      <div className={styles.toastList}>
        {toasts.map(toast => (
          <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>,
    document.body
  );
};

// Hook for managing toasts
import { useCallback } from 'react';
import { useSharedActions } from '../store';

export const useToast = () => {
  const { addNotification } = useSharedActions();

  const showToast = useCallback((
    type: ToastItem['type'],
    title: string,
    message?: string,
    duration?: number
  ) => {
    addNotification({
      type,
      title,
      message,
      duration, // Pass through the custom duration
    });
  }, [addNotification]);

  return {
    success: (title: string, message?: string, duration?: number) => showToast('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) => showToast('error', title, message, duration),
    warning: (title: string, message?: string, duration?: number) => showToast('warning', title, message, duration),
    info: (title: string, message?: string, duration?: number) => showToast('info', title, message, duration),
  };
};