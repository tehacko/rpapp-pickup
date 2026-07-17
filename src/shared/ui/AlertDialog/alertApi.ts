import {
  createElement,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialog, type AlertDialogVariant } from './AlertDialog.js';

export interface AlertApiOptions {
  readonly title: string;
  readonly message: string;
  readonly variant?: AlertDialogVariant;
  readonly actionLabel?: string;
}

export type AlertApiHandler = (options: AlertApiOptions) => void;

let alertHandler: AlertApiHandler | null = null;

export function registerAlertHandler(handler: AlertApiHandler): void {
  alertHandler = handler;
}

export function unregisterAlertHandler(): void {
  alertHandler = null;
}

/** Programmatic alert — wired to AlertDialog when AlertApiProvider is mounted. */
export function alertApi(options: AlertApiOptions): void {
  if (alertHandler === null) {
    return;
  }
  alertHandler(options);
}

interface PendingAlert {
  readonly options: AlertApiOptions;
}

export interface AlertApiProviderProps {
  readonly children: ReactNode;
}

export const AlertApiProvider = memo<AlertApiProviderProps>(({ children }) => {
  const { t } = useTranslation('pickup');
  const [pendingAlert, setPendingAlert] = useState<PendingAlert | null>(null);

  const requestAlert = useCallback((options: AlertApiOptions): void => {
    setPendingAlert({ options });
  }, []);

  useEffect(() => {
    registerAlertHandler(requestAlert);
    return (): void => {
      unregisterAlertHandler();
    };
  }, [requestAlert]);

  useEffect(() => {
    if (pendingAlert === null) {
      document.documentElement.removeAttribute('data-pickup-critical-flow');
      return;
    }
    document.documentElement.setAttribute('data-pickup-critical-flow', 'true');
    return (): void => {
      document.documentElement.removeAttribute('data-pickup-critical-flow');
    };
  }, [pendingAlert]);

  const dismissAlert = useCallback((): void => {
    setPendingAlert(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean): void => {
      if (!open) {
        dismissAlert();
      }
    },
    [dismissAlert],
  );

  const handleAction = useCallback((): void => {
    dismissAlert();
  }, [dismissAlert]);

  const dialog =
    pendingAlert === null
      ? null
      : createElement(AlertDialog, {
          open: true,
          onOpenChange: handleOpenChange,
          title: pendingAlert.options.title,
          description:
            pendingAlert.options.message !== ''
              ? pendingAlert.options.message
              : undefined,
          variant: pendingAlert.options.variant ?? 'info',
          actionLabel: pendingAlert.options.actionLabel ?? t('shared.ok'),
          onAction: handleAction,
          testId: 'pickup-alert-api-dialog',
        });

  return createElement(Fragment, null, children, dialog);
});

AlertApiProvider.displayName = 'AlertApiProvider';
