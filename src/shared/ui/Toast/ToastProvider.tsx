import { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import * as Toast from '@radix-ui/react-toast';
import {
  registerToastHandler,
  unregisterToastHandler,
  type ToastOptions,
  type ToastVariant,
} from './toastApi.js';
import { ToastViewport, type ToastRecord } from './ToastViewport.js';

const DEFAULT_TOAST_DURATION_MS = 5000;

let toastSequence = 0;

function createToastId(): string {
  toastSequence += 1;
  return `pickup-toast-${toastSequence}`;
}

export interface ToastProviderProps {
  readonly children: ReactNode;
}

export const ToastProvider = memo<ToastProviderProps>(({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions): void => {
    const variant: ToastVariant = options.variant ?? 'info';
    setToasts((current) => [
      ...current,
      {
        id: createToastId(),
        message: options.message,
        variant,
        duration: options.duration ?? DEFAULT_TOAST_DURATION_MS,
      },
    ]);
  }, []);

  useEffect(() => {
    registerToastHandler(showToast);
    return (): void => {
      unregisterToastHandler();
    };
  }, [showToast]);

  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </Toast.Provider>
  );
});

ToastProvider.displayName = 'ToastProvider';
