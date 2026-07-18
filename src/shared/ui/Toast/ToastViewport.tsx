import { memo, useCallback } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ToastVariant } from './toastApi.js';

export interface ToastRecord {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly duration: number;
}

export interface ToastViewportProps {
  readonly toasts: readonly ToastRecord[];
  readonly onDismiss: (id: string) => void;
}

function rootClassName(variant: ToastVariant): string {
  const base =
    'pointer-events-auto flex items-start gap-3 rounded-[var(--radius-md)] px-4 py-3 text-base font-medium leading-normal shadow-lg motion-reduce:transition-none';
  if (variant === 'success') {
    return `${base} bg-[var(--color-success)] text-[var(--color-success-foreground)]`;
  }
  if (variant === 'error') {
    return `${base} bg-[var(--color-danger)] text-[var(--color-danger-foreground)]`;
  }
  // Keep TS key `info` — neutral/muted surface (never --color-info).
  return `${base} border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-on-surface)]`;
}

export const ToastViewport = memo<ToastViewportProps>(({ toasts, onDismiss }) => {
  const { t } = useTranslation('pickup');

  const createOpenChangeHandler = useCallback(
    (id: string) => (open: boolean): void => {
      if (!open) {
        onDismiss(id);
      }
    },
    [onDismiss],
  );

  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          className={rootClassName(toast.variant)}
          duration={toast.duration}
          open
          onOpenChange={createOpenChangeHandler(toast.id)}
          data-testid={`pickup-toast-${toast.variant}`}
          data-toast-variant={toast.variant}
          role={toast.variant === 'error' ? 'alert' : 'status'}
        >
          <Toast.Title className="m-0 flex-1 text-inherit font-medium leading-inherit">
            {toast.message}
          </Toast.Title>
          <Toast.Close asChild>
            <button
              type="button"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-inherit hover:bg-[color-mix(in_oklab,currentColor_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              aria-label={t('shared.notificationCloseAria')}
              data-testid="pickup-toast-close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport
        className="pointer-events-none fixed right-5 top-5 z-[var(--pickup-z-90)] flex w-[min(22.5rem,calc(100vw-2.5rem))] flex-col gap-3 outline-none"
        data-testid="pickup-toast-viewport"
      />
    </>
  );
});

ToastViewport.displayName = 'ToastViewport';
