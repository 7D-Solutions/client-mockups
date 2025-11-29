// Connected Toast Container that uses shared state
import React from 'react';
import { ToastContainer } from './Toast';
import { useSharedState, useSharedActions } from '../store';
import { TOAST_DURATION_MS } from '../constants/toast';

export const ConnectedToastContainer: React.FC = () => {
  const { notifications } = useSharedState();
  const { markNotificationRead } = useSharedActions();

  // Convert unread notifications to toasts format
  const toasts = (notifications || [])
    .filter(notification => !notification.read)
    .map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      duration: notification.duration || TOAST_DURATION_MS, // Use custom duration or default
    }));

  const handleRemove = (id: string) => {
    markNotificationRead(id);
  };

  return <ToastContainer toasts={toasts} onRemove={handleRemove} />;
};