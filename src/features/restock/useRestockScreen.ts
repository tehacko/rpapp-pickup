import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import {
  clearInventoryDraft,
  isPickupOnline,
  readInventoryDraft,
  writeInventoryDraft,
} from '../../shared/inventory/inventoryDraftStore.js';
import { generateClientDraftKey, generateInventoryIdempotencyKey } from '../../shared/inventory/inventoryHttp.js';
import { confirmApi } from '../../shared/ui/confirm/confirmApi.js';
import { buildRestockViewModel, type RestockViewModel } from './buildRestockViewModel.js';
import type { IRestockGateway } from './IRestockGateway.js';
import { restockGateway } from './restockGateway.js';
import {
  restockStockRowKey,
  type RestockBatchDraft,
  type RestockBatchLineDraft,
  type RestockResumeCandidate,
  type RestockServerBatch,
  type RestockStockRow,
} from './restockTypes.js';

const DEFAULT_DRAFT_KEY = 'local-restock-draft';

function emptyDraft(clientDraftKey = DEFAULT_DRAFT_KEY): RestockBatchDraft {
  return {
    clientDraftKey,
    serverBatchId: null,
    title: '',
    status: 'DRAFT',
    lines: [],
  };
}

export interface RestockScreenActions {
  readonly retryOnlineCheck: () => void;
  readonly retryStock: () => void;
  readonly setQuery: (value: string) => void;
  readonly addStockRow: (productId: number, variantId: number | null) => void;
  readonly incrementLine: (productId: number, variantId: number | null) => void;
  readonly decrementLine: (productId: number, variantId: number | null) => void;
  readonly removeLine: (productId: number, variantId: number | null) => void;
  readonly attemptApply: () => void;
  readonly selectResumeBatch: (batchId: string) => void;
  readonly reopenSelectedBatch: () => void;
  readonly dismissStatus: () => void;
  readonly clearDraft: () => void;
}

export interface UseRestockScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canResupply: boolean;
  readonly viewModel: RestockViewModel;
  readonly actions: RestockScreenActions;
}

export function useRestockScreen(
  gateway: IRestockGateway = restockGateway,
): UseRestockScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { t } = useTranslation('pickup');
  const { entitledFunctions } = usePickupEntitlement(tenantCode);
  const { sessionClaims } = usePickupStaffSession();
  const salesPointId = sessionClaims?.salesPointId ?? 0;

  const canResupply = entitledFunctions.includes(PickupStaffFunction.STOCK_RESUPPLY);
  const [isOnline, setIsOnline] = useState(isPickupOnline);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] =
    useState<RestockViewModel['statusTone']>('neutral');
  const [query, setQuery] = useState('');
  const [stockRows, setStockRows] = useState<readonly RestockStockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockReloadToken, setStockReloadToken] = useState(0);
  const [applying, setApplying] = useState(false);
  const [resumeSynced, setResumeSynced] = useState(false);
  const [resumeScopeKey, setResumeScopeKey] = useState(`${tenantCode}:${salesPointId}`);
  const nextResumeScopeKey = `${tenantCode}:${salesPointId}`;
  if (resumeScopeKey !== nextResumeScopeKey) {
    setResumeScopeKey(nextResumeScopeKey);
    setResumeSynced(false);
  }
  const [resumeCandidates, setResumeCandidates] = useState<readonly RestockResumeCandidate[]>([]);
  const [resumeBatches, setResumeBatches] = useState<readonly RestockServerBatch[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [draft, setDraft] = useState<RestockBatchDraft>(() => {
    const stored = readInventoryDraft<RestockBatchDraft>(
      'restock',
      tenantCode,
      salesPointId,
      DEFAULT_DRAFT_KEY,
    );
    return stored?.payload ?? emptyDraft();
  });

  useEffect(() => {
    const onOnline = (): void => {
      setIsOnline(true);
    };
    const onOffline = (): void => {
      setIsOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (salesPointId <= 0) {
      return;
    }
    writeInventoryDraft({
      kind: 'restock',
      tenantCode,
      salesPointId,
      clientDraftKey: DEFAULT_DRAFT_KEY,
      updatedAt: new Date().toISOString(),
      payload: { ...draft, clientDraftKey: DEFAULT_DRAFT_KEY },
    });
  }, [draft, salesPointId, tenantCode]);

  useEffect(() => {
    if (resumeSynced || accessToken === null || !canResupply) {
      return;
    }
    let cancelled = false;
    void gateway
      .listDraftBatches(tenantCode, accessToken)
      .then((batches) => {
        if (cancelled) {
          return;
        }
        const candidates = batches.map((batch) => ({
          id: batch.id,
          clientDraftKey: batch.clientDraftKey,
          status: (batch.status as RestockResumeCandidate['status']) ?? 'DRAFT',
          title: batch.title,
          lineCount: batch.lines.length,
        }));
        setResumeBatches(batches);
        setResumeCandidates(candidates);
        setDraft((prev) => {
          const byId =
            prev.serverBatchId === null
              ? undefined
              : batches.find((batch) => batch.id === prev.serverBatchId);
          const resumeBatch = byId;
          if (resumeBatch === undefined) {
            return prev;
          }
          const resumeLines =
            prev.lines.length > 0
              ? prev.lines
              : resumeBatch.lines.map((line) => ({
                  productId: line.productId,
                  variantId: line.variantId,
                  productLabel: `#${String(line.productId)}`,
                  deltaQuantity: line.delta,
                  note: line.note,
                }));
          return {
            ...prev,
            clientDraftKey:
              resumeBatch.clientDraftKey.length > 0
                ? resumeBatch.clientDraftKey
                : prev.clientDraftKey,
            serverBatchId: resumeBatch.id,
            status: (resumeBatch.status as RestockBatchDraft['status']) ?? prev.status,
            title: resumeBatch.title ?? prev.title,
            lines: resumeLines,
          };
        });
        setSelectedResumeId((prev) => {
          const preferred =
            candidates.find((candidate) => candidate.id === draft.serverBatchId)?.id ??
            candidates[0]?.id ??
            null;
          return prev ?? preferred;
        });
      })
      .catch(() => {
        // Draft remains local-only when resume lookup fails.
      })
      .finally(() => {
        if (!cancelled) {
          setResumeSynced(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, canResupply, draft.serverBatchId, gateway, resumeSynced, tenantCode]);

  useEffect(() => {
    if (accessToken === null || !canResupply) {
      return;
    }
    let cancelled = false;
    // Defer loading flags out of the sync effect body (mirrors useSellScreen catalog fetch).
    const handle = window.setTimeout(() => {
      setStockLoading(true);
      setStockError(null);
      void gateway
        .listStock(tenantCode, accessToken)
        .then((rows) => {
          if (!cancelled) {
            setStockRows(rows);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setStockError(
              err instanceof Error ? err.message : t('pickup.restock.stockLoadFailed'),
            );
            setStockRows([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setStockLoading(false);
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, canResupply, gateway, stockReloadToken, t, tenantCode]);

  const upsertLine = useCallback(
    (
      productId: number,
      variantId: number | null,
      mutator: (current: number) => number,
      labelFallback: string,
    ): void => {
      setDraft((prev) => {
        const key = restockStockRowKey(productId, variantId);
        const existing = prev.lines.find(
          (line) => restockStockRowKey(line.productId, line.variantId) === key,
        );
        const nextDelta = mutator(existing?.deltaQuantity ?? 0);
        if (nextDelta <= 0) {
          return {
            ...prev,
            lines: prev.lines.filter(
              (line) => restockStockRowKey(line.productId, line.variantId) !== key,
            ),
          };
        }
        const nextLine: RestockBatchLineDraft = {
          productId,
          variantId,
          productLabel: existing?.productLabel ?? labelFallback,
          deltaQuantity: nextDelta,
          note: existing?.note ?? null,
        };
        if (existing === undefined) {
          return { ...prev, lines: [...prev.lines, nextLine] };
        }
        return {
          ...prev,
          lines: prev.lines.map((line) =>
            restockStockRowKey(line.productId, line.variantId) === key ? nextLine : line,
          ),
        };
      });
    },
    [],
  );

  const attemptApply = useCallback((): void => {
    if (!isPickupOnline()) {
      setIsOnline(false);
      setStatusTone('warn');
      setStatusMessage(t('pickup.restock.offlineApplyBlocked'));
      return;
    }
    if (accessToken === null || draft.lines.length === 0) {
      return;
    }
    void (async () => {
      const confirmed = await confirmApi({
        title: t('pickup.restock.confirmTitle'),
        message: t('pickup.restock.confirmMessage', {
          count: draft.lines.length,
          total: draft.lines.reduce((sum, line) => sum + line.deltaQuantity, 0),
        }),
        confirmLabel: t('pickup.restock.applyCta'),
        cancelLabel: t('pickup.restock.confirmCancel'),
        variant: 'warning',
      });
      if (!confirmed) {
        return;
      }
      setApplying(true);
      setAppliedSuccess(false);
      setStatusMessage(null);
      try {
        const syncDraft: RestockBatchDraft = {
          ...draft,
          clientDraftKey:
            draft.clientDraftKey.length > 0
              ? draft.clientDraftKey
              : generateClientDraftKey('restock'),
        };
        await gateway.applyDraft(
          tenantCode,
          accessToken,
          syncDraft,
          generateInventoryIdempotencyKey(),
        );
        setStatusTone('success');
        setStatusMessage(
          `${t('pickup.restock.applySuccess')} (${syncDraft.lines.length} line${syncDraft.lines.length === 1 ? '' : 's'})`,
        );
        setDraft(emptyDraft(generateClientDraftKey('restock')));
        clearInventoryDraft('restock', tenantCode, salesPointId, DEFAULT_DRAFT_KEY);
        setStockReloadToken((value) => value + 1);
        setAppliedSuccess(true);
      } catch (err: unknown) {
        setStatusTone('danger');
        setStatusMessage(
          err instanceof Error ? err.message : t('pickup.restock.applyFailed'),
        );
      } finally {
        setApplying(false);
      }
    })();
  }, [accessToken, draft, gateway, salesPointId, t, tenantCode]);

  const reopenSelectedBatch = useCallback((): void => {
    if (selectedResumeId === null) {
      return;
    }
    const candidate = resumeCandidates.find((item) => item.id === selectedResumeId);
    const sourceBatch = resumeBatches.find((item) => item.id === selectedResumeId);
    if (candidate === undefined || sourceBatch === undefined) {
      return;
    }
    setDraft((prev) => ({
      ...prev,
      serverBatchId: candidate.id,
      clientDraftKey:
        candidate.clientDraftKey.length > 0 ? candidate.clientDraftKey : prev.clientDraftKey,
      title: candidate.title ?? prev.title,
      status: candidate.status,
      lines:
        prev.serverBatchId === candidate.id && prev.lines.length > 0
          ? prev.lines
          : sourceBatch.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productLabel: `#${String(line.productId)}`,
              deltaQuantity: line.delta,
              note: line.note,
            })),
    }));
    setAppliedSuccess(false);
    setStatusTone('neutral');
    setStatusMessage(t('pickup.restock.resumeSelected'));
  }, [resumeBatches, resumeCandidates, selectedResumeId, t]);

  const viewModel = useMemo(
    () =>
      buildRestockViewModel({
        tenantCode,
        canResupply,
        isOnline,
        statusMessage,
        statusTone,
        query,
        stockLoading,
        stockError,
        stockRows,
        draftLines: draft.lines,
        applying,
        resumeCandidates,
        selectedResumeId,
        appliedSuccess,
      }),
    [
      applying,
      canResupply,
      draft.lines,
      isOnline,
      query,
      resumeCandidates,
      selectedResumeId,
      statusMessage,
      statusTone,
      stockError,
      stockLoading,
      stockRows,
      tenantCode,
      appliedSuccess,
    ],
  );

  const actions = useMemo<RestockScreenActions>(
    () => ({
      retryOnlineCheck: (): void => {
        setIsOnline(isPickupOnline());
        setStatusMessage(null);
      },
      retryStock: (): void => {
        setStockReloadToken((value) => value + 1);
      },
      setQuery,
      addStockRow: (productId, variantId): void => {
        const stock = stockRows.find(
          (row) =>
            row.productId === productId &&
            (row.variantId ?? null) === (variantId ?? null),
        );
        upsertLine(productId, variantId, (current) => current + 1, stock?.productLabel ?? `#${String(productId)}`);
      },
      incrementLine: (productId, variantId): void => {
        upsertLine(productId, variantId, (current) => current + 1, `#${String(productId)}`);
      },
      decrementLine: (productId, variantId): void => {
        upsertLine(productId, variantId, (current) => current - 1, `#${String(productId)}`);
      },
      removeLine: (productId, variantId): void => {
        setDraft((prev) => ({
          ...prev,
          lines: prev.lines.filter(
            (line) =>
              restockStockRowKey(line.productId, line.variantId) !==
              restockStockRowKey(productId, variantId),
          ),
        }));
      },
      attemptApply,
      selectResumeBatch: (batchId): void => {
        setSelectedResumeId(batchId);
      },
      reopenSelectedBatch,
      dismissStatus: (): void => {
        setStatusMessage(null);
      },
      clearDraft: (): void => {
        setDraft(emptyDraft(generateClientDraftKey('restock')));
        setAppliedSuccess(false);
        clearInventoryDraft('restock', tenantCode, salesPointId, DEFAULT_DRAFT_KEY);
      },
    }),
    [attemptApply, reopenSelectedBatch, salesPointId, stockRows, tenantCode, upsertLine],
  );

  return { accessToken, tenantCode, canResupply, viewModel, actions };
}
