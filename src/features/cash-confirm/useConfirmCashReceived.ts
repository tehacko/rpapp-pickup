import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchQueue } from '../../api/pickupApi.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import { toastApi } from '../../shared/ui/Toast/toastApi.js';
import { cashConfirmGateway } from './cashConfirmGateway.js';
import type { ICashConfirmGateway } from './ICashConfirmGateway.js';
import { isPickupCashConfirmEnabled, warnPickupCashConfirmBackendDisabled } from './pickupCashConfirmEnabled.js';
import { recoverCashConfirmFromQueue } from './recoverCashConfirmFromQueue.js';
import { PickupApiError } from '../../api/pickupApi.js';

function createCashConfirmIdempotencyKey(transactionId: number): string {
  return `pickup-cash-confirm:${String(transactionId)}`;
}

export interface UseConfirmCashReceivedOptions {
  readonly tenantCode: string;
  readonly accessToken: string | null;
  readonly onSuccess?: () => void;
  readonly gateway?: ICashConfirmGateway;
  /** Tenant payment_cash write � mirrors admin canConfirmCashPayment. */
  readonly canConfirmCashPayment?: boolean;
}

export interface UseConfirmCashReceivedResult {
  readonly cashConfirmEnabled: boolean;
  readonly pendingTransactionId: number | null;
  readonly confirmCashReceived: (transactionId: number) => void;
}

export function useConfirmCashReceived(
  options: UseConfirmCashReceivedOptions,
): UseConfirmCashReceivedResult {
  const {
    tenantCode,
    accessToken,
    onSuccess,
    gateway = cashConfirmGateway,
    canConfirmCashPayment = true,
  } = options;
  const { t } = useTranslation('pickup');
  const { handleError } = usePickupErrorHandler();
  const cashConfirmEnabled = isPickupCashConfirmEnabled();
  const [pendingTransactionId, setPendingTransactionId] = useState<number | null>(null);
  const idempotencyKeysRef = useRef<Map<number, string>>(new Map());

  const resolveIdempotencyKey = useCallback((transactionId: number): string => {
    const existing = idempotencyKeysRef.current.get(transactionId);
    if (existing !== undefined) {
      return existing;
    }
    const created = createCashConfirmIdempotencyKey(transactionId);
    idempotencyKeysRef.current.set(transactionId, created);
    return created;
  }, []);

  const recoverAfterAmbiguousFailure = useCallback(
    async (transactionId: number): Promise<'COMPLETED' | 'RETRY'> => {
      // Stage 2 section 16: AbortError / timeout / transport failure � read queue; never assume COMPLETED.
      if (accessToken === null) {
        return 'RETRY';
      }
      try {
        const queue = await fetchQueue(tenantCode, accessToken);
        const recovery = recoverCashConfirmFromQueue(queue.items, transactionId);
        if (recovery === 'COMPLETED') {
          return 'COMPLETED';
        }
      } catch {
        // Fall through to retry messaging.
      }
      return 'RETRY';
    },
    [accessToken, tenantCode],
  );

  const confirmCashReceived = useCallback(
    (transactionId: number): void => {
      if (!cashConfirmEnabled || !canConfirmCashPayment || accessToken === null || pendingTransactionId !== null) {
        return;
      }
      void (async () => {
        setPendingTransactionId(transactionId);
        const idempotencyKey = resolveIdempotencyKey(transactionId);
        try {
          const result = await gateway.confirmCashReceived(
            tenantCode,
            accessToken,
            transactionId,
            idempotencyKey,
          );
          toastApi(
            result.idempotent === true
              ? t('pickup.cashConfirm.alreadyCompleted')
              : t('pickup.cashConfirm.success'),
            'success',
          );
          onSuccess?.();
        } catch (err) {
          if (err instanceof PickupApiError && err.code === 'PICKUP_CASH_CONFIRM_DISABLED') {
            warnPickupCashConfirmBackendDisabled();
          }
          const recovery = await recoverAfterAmbiguousFailure(transactionId);
          if (recovery === 'COMPLETED') {
            toastApi(t('pickup.cashConfirm.alreadyCompleted'), 'success');
            onSuccess?.();
            return;
          }
          handleError(err, 'cashConfirm.confirm');
          toastApi(t('pickup.cashConfirm.retry'), 'error');
        } finally {
          setPendingTransactionId(null);
        }
      })();
    },
    [
      accessToken,
      canConfirmCashPayment,
      cashConfirmEnabled,
      gateway,
      handleError,
      onSuccess,
      pendingTransactionId,
      recoverAfterAmbiguousFailure,
      resolveIdempotencyKey,
      t,
      tenantCode,
    ],
  );

  return { cashConfirmEnabled, pendingTransactionId, confirmCashReceived };
}
