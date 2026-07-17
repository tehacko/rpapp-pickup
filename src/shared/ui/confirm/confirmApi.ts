import {
  createElement,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog.js';

export type ConfirmApiVariant = 'default' | 'destructive' | 'warning';

export interface ConfirmApiOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: ConfirmApiVariant;
  readonly isConfirming?: boolean;
}

export type ConfirmApiHandler = (options: ConfirmApiOptions) => Promise<boolean>;

let confirmHandler: ConfirmApiHandler | null = null;

export function registerConfirmHandler(handler: ConfirmApiHandler): void {
  confirmHandler = handler;
}

export function unregisterConfirmHandler(): void {
  confirmHandler = null;
}

/** Programmatic confirm — resolves via ConfirmDialog when ConfirmApiProvider is mounted. */
export async function confirmApi(options: ConfirmApiOptions): Promise<boolean> {
  if (confirmHandler === null) {
    return false;
  }
  return confirmHandler(options);
}

interface PendingConfirm {
  readonly options: ConfirmApiOptions;
  readonly resolve: (confirmed: boolean) => void;
}

export interface ConfirmApiProviderProps {
  readonly children: ReactNode;
}

export const ConfirmApiProvider = memo<ConfirmApiProviderProps>(({ children }) => {
  const { t } = useTranslation('pickup');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const returnFocusTargetRef = useRef<HTMLElement | null>(null);

  const requestConfirm = useCallback((options: ConfirmApiOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (typeof document !== 'undefined') {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          returnFocusTargetRef.current = activeElement;
        }
      }
      setPendingConfirm({ options, resolve });
    });
  }, []);

  useEffect(() => {
    registerConfirmHandler(requestConfirm);
    return (): void => {
      unregisterConfirmHandler();
    };
  }, [requestConfirm]);

  useEffect(() => {
    if (pendingConfirm === null) {
      document.documentElement.removeAttribute('data-pickup-critical-flow');
      return;
    }
    document.documentElement.setAttribute('data-pickup-critical-flow', 'true');
    return (): void => {
      document.documentElement.removeAttribute('data-pickup-critical-flow');
    };
  }, [pendingConfirm]);

  const settleConfirm = useCallback((confirmed: boolean): void => {
    setPendingConfirm((current) => {
      current?.resolve(confirmed);
      return null;
    });
    const returnFocusTarget = returnFocusTargetRef.current;
    if (returnFocusTarget !== null) {
      returnFocusTarget.focus();
      returnFocusTargetRef.current = null;
    }
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean): void => {
      if (!open) {
        settleConfirm(false);
      }
    },
    [settleConfirm],
  );

  const handleConfirm = useCallback((): void => {
    settleConfirm(true);
  }, [settleConfirm]);

  const dialog =
    pendingConfirm === null
      ? null
      : createElement(ConfirmDialog, {
          open: true,
          onOpenChange: handleOpenChange,
          title: pendingConfirm.options.title,
          description:
            pendingConfirm.options.message !== ''
              ? pendingConfirm.options.message
              : undefined,
          variant: pendingConfirm.options.variant ?? 'default',
          confirmLabel: pendingConfirm.options.confirmLabel ?? t('shared.confirm'),
          cancelLabel: pendingConfirm.options.cancelLabel ?? t('shared.cancel'),
          isConfirming: pendingConfirm.options.isConfirming ?? false,
          onConfirm: handleConfirm,
          testId: 'pickup-confirm-api-dialog',
        });

  return createElement(Fragment, null, children, dialog);
});

ConfirmApiProvider.displayName = 'ConfirmApiProvider';
