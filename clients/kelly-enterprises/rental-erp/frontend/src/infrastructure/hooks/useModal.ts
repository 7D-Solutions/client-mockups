import { useState, useCallback } from 'react';

interface ModalOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions | null;
  resolve: ((value: boolean) => void) | null;
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const showModal = useCallback((options: ModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const closeModal = useCallback((result: boolean) => {
    if (modalState.resolve) {
      modalState.resolve(result);
    }
    setModalState({
      isOpen: false,
      options: null,
      resolve: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmModal = useCallback(() => closeModal(true), [closeModal]);
  const cancelModal = useCallback(() => closeModal(false), [closeModal]);

  return {
    showModal,
    closeModal,
    confirmModal,
    cancelModal,
    modalState,
  };
}