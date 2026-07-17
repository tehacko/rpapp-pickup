import { memo, useCallback } from 'react';
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '../surfacePrimitives.js';

export type AlertDialogVariant = 'success' | 'error' | 'info';

export interface AlertDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly variant?: AlertDialogVariant;
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly testId?: string;
  readonly messageTestId?: string;
  readonly actionTestId?: string;
}

function messageClassName(variant: AlertDialogVariant): string {
  if (variant === 'success') {
    return 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900';
  }
  if (variant === 'error') {
    return 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800';
  }
  return 'rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900';
}

export const AlertDialog = memo<AlertDialogProps>(({
  open,
  onOpenChange,
  title,
  description,
  variant = 'info',
  actionLabel,
  onAction,
  testId = 'pickup-alert-dialog',
  messageTestId,
  actionTestId,
}) => {
  const handleAction = useCallback((): void => {
    onAction();
  }, [onAction]);

  const resolvedMessageTestId = messageTestId ?? `${testId}-message`;
  const resolvedActionTestId = actionTestId ?? `${testId}-action`;

  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay
          className="fixed inset-0 z-[var(--pickup-z-80)] bg-black/45 motion-reduce:transition-none"
          data-testid={`${testId}-overlay`}
        />
        <RadixAlertDialog.Content
          className="fixed left-1/2 top-1/2 z-[calc(var(--pickup-z-80)+1)] flex w-[min(calc(100vw-2rem),26rem)] max-h-[min(90vh,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-xl motion-reduce:transition-none"
          data-testid={testId}
          aria-describedby={description !== undefined ? `${testId}-description` : undefined}
        >
          <header className="px-6 pb-2 pt-6">
            <RadixAlertDialog.Title className="m-0 text-xl font-bold tracking-tight">
              {title}
            </RadixAlertDialog.Title>
          </header>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 pb-4">
            {description !== undefined ? (
              <RadixAlertDialog.Description
                id={`${testId}-description`}
                className={messageClassName(variant)}
                data-testid={resolvedMessageTestId}
                data-variant={variant}
                asChild={typeof description !== 'string'}
              >
                {typeof description === 'string' ? description : <div>{description}</div>}
              </RadixAlertDialog.Description>
            ) : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
            <RadixAlertDialog.Action asChild>
              <Button
                type="button"
                intent="primary"
                onClick={handleAction}
                data-testid={resolvedActionTestId}
              >
                {actionLabel}
              </Button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
});

AlertDialog.displayName = 'AlertDialog';
