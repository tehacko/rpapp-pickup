import { memo, useCallback, useRef } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '../surfacePrimitives.js';

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning';

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly warning?: React.ReactNode;
  readonly variant?: ConfirmDialogVariant;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly confirmDisabled?: boolean;
  readonly isConfirming?: boolean;
  readonly disableCancelWhileConfirming?: boolean;
  readonly children?: React.ReactNode;
  readonly testId?: string;
}

function confirmIntent(variant: ConfirmDialogVariant): 'primary' | 'danger' | 'secondary' {
  if (variant === 'destructive') {
    return 'danger';
  }
  if (variant === 'warning') {
    return 'secondary';
  }
  return 'primary';
}

export const ConfirmDialog = memo<ConfirmDialogProps>(({
  open,
  onOpenChange,
  title,
  description,
  warning,
  variant = 'default',
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmDisabled = false,
  isConfirming = false,
  disableCancelWhileConfirming = false,
  children,
  testId = 'pickup-confirm-dialog',
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const handleConfirm = useCallback((): void => {
    onConfirm();
  }, [onConfirm]);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="fixed inset-0 z-[var(--pickup-z-80)] bg-black/45 motion-safe:animate-in motion-safe:fade-in motion-reduce:transition-none"
          data-testid={`${testId}-overlay`}
        />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-[calc(var(--pickup-z-80)+1)] flex w-[min(calc(100vw-2rem),26rem)] max-h-[min(90vh,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-xl motion-reduce:transition-none"
          data-testid={testId}
          aria-describedby={description !== undefined ? `${testId}-description` : undefined}
          onOpenAutoFocus={(event) => {
            if (variant === 'destructive' || variant === 'warning') {
              event.preventDefault();
              cancelButtonRef.current?.focus();
            }
          }}
        >
          <header className="px-6 pb-2 pt-6">
            <AlertDialog.Title className="m-0 text-xl font-bold tracking-tight">
              {title}
            </AlertDialog.Title>
          </header>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 pb-4">
            {description !== undefined ? (
              <AlertDialog.Description
                id={`${testId}-description`}
                className="mb-3 text-base leading-relaxed"
                asChild={typeof description !== 'string'}
              >
                {typeof description === 'string' ? description : <div>{description}</div>}
              </AlertDialog.Description>
            ) : null}
            {warning !== undefined ? (
              <p className="m-0 text-sm font-semibold text-[var(--color-danger)]">{warning}</p>
            ) : null}
            {children}
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
            <AlertDialog.Cancel asChild>
              <Button
                ref={cancelButtonRef}
                type="button"
                intent="secondary"
                disabled={isConfirming ? disableCancelWhileConfirming : false}
              >
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                type="button"
                intent={confirmIntent(variant)}
                disabled={confirmDisabled || isConfirming}
                onClick={handleConfirm}
                data-testid={`${testId}-confirm`}
              >
                {isConfirming ? `${confirmLabel}...` : confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
