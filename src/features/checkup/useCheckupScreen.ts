import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShrinkageReason } from 'pi-kiosk-shared/contracts/inventory';
import { PickupApiError } from '../../api/pickupApi.js';
import { PickupStaffFunction, hasPickupHoldFloorOverrideCapability } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import {
  clearInventoryDraft,
  isPickupOnline,
  readInventoryDraft,
  writeInventoryDraft,
} from '../../shared/inventory/inventoryDraftStore.js';
import {
  isCheckupStockMovedCode,
  isInventoryConflictError,
} from '../../shared/inventory/inventoryApiError.js';
import {
  generateClientDraftKey,
  generateInventoryIdempotencyKey,
} from '../../shared/inventory/inventoryHttp.js';
import { confirmApi } from '../../shared/ui/confirm/confirmApi.js';
import { buildCheckupViewModel, type CheckupViewModel } from './buildCheckupViewModel.js';
import type { ICheckupGateway } from './ICheckupGateway.js';
import { checkupGateway } from './checkupGateway.js';
import type {
  CheckupConflictState,
  CheckupDraft,
  CheckupLineDraft,
  CheckupResumeCandidate,
} from './checkupTypes.js';

const DEFAULT_DRAFT_KEY = 'local-checkup-draft';

function emptyDraft(clientDraftKey = DEFAULT_DRAFT_KEY): CheckupDraft {
  return {
    clientDraftKey,
    serverCheckupId: null,
    scopeMode: 'ACTIVE_STOCK',
    status: 'DRAFT',
    lines: [],
  };
}

function documentToDraft(
  doc: {
    id: string;
    clientDraftKey: string;
    status: string;
    scopeMode: CheckupDraft['scopeMode'];
    lines: readonly {
      id: string;
      productId: number;
      variantId: number | null;
      expectedQuantity: number;
      expectedStockOnHold: number;
      countedQuantity: number | null;
      shrinkageReason: ShrinkageReason | null;
      included: boolean;
      productLabel?: string;
    }[];
  },
): CheckupDraft {
  return {
    clientDraftKey: doc.clientDraftKey || DEFAULT_DRAFT_KEY,
    serverCheckupId: doc.id,
    scopeMode: doc.scopeMode,
    status: (doc.status as CheckupDraft['status']) || 'IN_PROGRESS',
    lines: doc.lines.map(
      (line): CheckupLineDraft => ({
        lineId: line.id,
        productId: line.productId,
        variantId: line.variantId,
        productLabel: line.productLabel ?? `#${String(line.productId)}`,
        expectedQuantity: line.expectedQuantity,
        expectedStockOnHold: line.expectedStockOnHold,
        countedQuantity: line.countedQuantity,
        shrinkageReason: line.shrinkageReason,
        included: line.included,
      }),
    ),
  };
}

export interface CheckupScreenActions {
  readonly retryOnlineCheck: () => void;
  readonly startCheckup: () => void;
  readonly incrementCounted: (lineId: string) => void;
  readonly decrementCounted: (lineId: string) => void;
  readonly setShrinkageReason: (lineId: string, reason: ShrinkageReason | null) => void;
  readonly attemptApply: () => void;
  readonly setOverrideReason: (reason: string) => void;
  readonly retryApplyWithOverride: () => void;
  readonly refreshSnapshot: () => void;
  readonly selectResumeCheckup: (checkupId: string) => void;
  readonly resumeSelectedCheckup: () => void;
  readonly dismissStatus: () => void;
  readonly dismissConflict: () => void;
}

export interface UseCheckupScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canResupply: boolean;
  readonly viewModel: CheckupViewModel;
  readonly actions: CheckupScreenActions;
}

export function useCheckupScreen(
  gateway: ICheckupGateway = checkupGateway,
): UseCheckupScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { t } = useTranslation('pickup');
  const { entitledFunctions } = usePickupEntitlement(tenantCode);
  const { sessionClaims } = usePickupStaffSession();
  const salesPointId = sessionClaims?.salesPointId ?? 0;

  const canResupply = entitledFunctions.includes(PickupStaffFunction.STOCK_RESUPPLY);
  const canOverrideHoldFloor = hasPickupHoldFloorOverrideCapability(
    sessionClaims?.capabilities,
  );
  const [isOnline, setIsOnline] = useState(isPickupOnline);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] =
    useState<CheckupViewModel['statusTone']>('neutral');
  const [starting, setStarting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resumeSynced, setResumeSynced] = useState(false);
  const [resumeScopeKey, setResumeScopeKey] = useState(`${tenantCode}:${salesPointId}`);
  const nextResumeScopeKey = `${tenantCode}:${salesPointId}`;
  if (resumeScopeKey !== nextResumeScopeKey) {
    setResumeScopeKey(nextResumeScopeKey);
    setResumeSynced(false);
  }
  const [resumeCandidates, setResumeCandidates] = useState<readonly CheckupResumeCandidate[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CheckupConflictState | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [draft, setDraft] = useState<CheckupDraft>(() => {
    const stored = readInventoryDraft<CheckupDraft>(
      'checkup',
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
    if (resumeSynced || accessToken === null || !canResupply) {
      return;
    }
    let cancelled = false;
    void gateway
      .listOpen(tenantCode, accessToken)
      .then((openDocs) => {
        if (cancelled) {
          return;
        }
        const candidates = openDocs.map((doc) => ({
          id: doc.id,
          clientDraftKey: doc.clientDraftKey,
          status: (doc.status as CheckupResumeCandidate['status']) ?? 'IN_PROGRESS',
          lineCount: doc.lines.length,
        }));
        setResumeCandidates(candidates);
        setDraft((prev) => {
          const byId =
            prev.serverCheckupId === null
              ? undefined
              : openDocs.find((doc) => doc.id === prev.serverCheckupId);
          const resumeDoc = byId;
          // List rows without lines must not wipe a local draft (pre-status-filter empty payloads).
          if (resumeDoc === undefined || resumeDoc.lines.length === 0) {
            return prev;
          }
          return documentToDraft(resumeDoc);
        });
        setSelectedResumeId((prev) => {
          const preferred =
            candidates.find((candidate) => candidate.id === draft.serverCheckupId)?.id ??
            candidates[0]?.id ??
            null;
          return prev ?? preferred;
        });
      })
      .catch(() => {
        // Keep local draft if open-checkup resume call fails.
      })
      .finally(() => {
        if (!cancelled) {
          setResumeSynced(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, canResupply, draft.serverCheckupId, gateway, resumeSynced, tenantCode]);

  useEffect(() => {
    if (salesPointId <= 0) {
      return;
    }
    writeInventoryDraft({
      kind: 'checkup',
      tenantCode,
      salesPointId,
      clientDraftKey: DEFAULT_DRAFT_KEY,
      updatedAt: new Date().toISOString(),
      payload: draft,
    });
  }, [draft, salesPointId, tenantCode]);

  const syncLineToServer = useCallback(
    async (line: CheckupLineDraft): Promise<void> => {
      if (accessToken === null || draft.serverCheckupId === null || !isPickupOnline()) {
        return;
      }
      try {
        const doc = await gateway.patchLine(
          tenantCode,
          accessToken,
          draft.serverCheckupId,
          line.lineId,
          {
            countedQuantity: line.countedQuantity,
            shrinkageReason: line.shrinkageReason,
            included: line.included,
          },
        );
        setDraft(documentToDraft(doc));
      } catch {
        // Local draft remains durable; next apply/patch will retry.
      }
    },
    [accessToken, draft.serverCheckupId, gateway, tenantCode],
  );

  const updateLocalLine = useCallback(
    (lineId: string, mutator: (line: CheckupLineDraft) => CheckupLineDraft): void => {
      let updated: CheckupLineDraft | undefined;
      setDraft((prev) => {
        const nextLines = prev.lines.map((line) => {
          if (line.lineId !== lineId) {
            return line;
          }
          updated = mutator(line);
          return updated;
        });
        return { ...prev, lines: nextLines };
      });
      if (updated !== undefined) {
        window.setTimeout(() => {
          if (updated !== undefined) {
            void syncLineToServer(updated);
          }
        }, 0);
      }
    },
    [syncLineToServer],
  );

  const startCheckup = useCallback((): void => {
    if (!isPickupOnline()) {
      setIsOnline(false);
      setStatusTone('warn');
      setStatusMessage(t('pickup.checkup.offlineApplyBlocked'));
      return;
    }
    if (accessToken === null) {
      return;
    }
    setStarting(true);
    setConflict(null);
    setOverrideReason('');
    setStatusMessage(null);
    setSelectedResumeId(null);
    const clientDraftKey = generateClientDraftKey('checkup');
    void gateway
      .startFresh(tenantCode, accessToken, {
        clientDraftKey,
        scopeMode: 'ACTIVE_STOCK',
      })
      .then((doc) => {
        setDraft(documentToDraft(doc));
        setStatusTone('neutral');
        setStatusMessage(t('pickup.checkup.started'));
      })
      .catch((err: unknown) => {
        setStatusTone('danger');
        const raw = err instanceof Error ? err.message.trim() : '';
        const isGenericValidation =
          err instanceof PickupApiError && raw.toLowerCase() === 'validation failed';
        setStatusMessage(
          isGenericValidation || raw.length === 0 ? t('pickup.checkup.startFailed') : raw,
        );
      })
      .finally(() => {
        setStarting(false);
      });
  }, [accessToken, gateway, t, tenantCode]);

  const resumeSelectedCheckup = useCallback((): void => {
    if (selectedResumeId === null || accessToken === null) {
      return;
    }
    const candidate = resumeCandidates.find((item) => item.id === selectedResumeId);
    if (candidate === undefined) {
      return;
    }
    setDraft((prev) => ({
      ...prev,
      serverCheckupId: candidate.id,
      clientDraftKey:
        candidate.clientDraftKey.length > 0 ? candidate.clientDraftKey : prev.clientDraftKey,
      status: candidate.status,
    }));
    setStatusTone('neutral');
    setStatusMessage(t('pickup.checkup.resumeSelected'));
  }, [accessToken, resumeCandidates, selectedResumeId, t]);

  const refreshSnapshot = useCallback((): void => {
    if (!isPickupOnline() || accessToken === null) {
      setIsOnline(false);
      setStatusTone('warn');
      setStatusMessage(t('pickup.checkup.offlineApplyBlocked'));
      return;
    }
    setRefreshing(true);
    setConflict(null);
    setOverrideReason('');
    void gateway
      .refreshSnapshot(
        tenantCode,
        accessToken,
        draft,
        generateClientDraftKey('checkup'),
      )
      .then((doc) => {
        setDraft(documentToDraft(doc));
        setStatusTone('success');
        setStatusMessage(t('pickup.checkup.snapshotRefreshed'));
      })
      .catch((err: unknown) => {
        setStatusTone('danger');
        setStatusMessage(
          err instanceof Error ? err.message : t('pickup.checkup.refreshFailed'),
        );
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [accessToken, draft, gateway, t, tenantCode]);

  const attemptApply = useCallback((): void => {
    if (!isPickupOnline()) {
      setIsOnline(false);
      setStatusTone('warn');
      setStatusMessage(t('pickup.checkup.offlineApplyBlocked'));
      return;
    }
    if (accessToken === null || draft.serverCheckupId === null) {
      return;
    }
    const serverCheckupId = draft.serverCheckupId;
    void (async () => {
      const confirmed = await confirmApi({
        title: t('pickup.checkup.confirmTitle'),
        message: t('pickup.checkup.confirmMessage', { count: draft.lines.length }),
        confirmLabel: t('pickup.checkup.applyCta'),
        cancelLabel: t('pickup.checkup.confirmCancel'),
        variant: 'warning',
      });
      if (!confirmed) {
        return;
      }
      setApplying(true);
      setConflict(null);
      setStatusMessage(null);
      try {
        const result = await gateway.applyCheckup(
          tenantCode,
          accessToken,
          serverCheckupId,
          generateInventoryIdempotencyKey(),
        );
        setStatusTone('success');
        setStatusMessage(
          result.incidentOpened
            ? t('pickup.checkup.applySuccessIncident')
            : t('pickup.checkup.applySuccess'),
        );
        setDraft(emptyDraft(generateClientDraftKey('checkup')));
        setOverrideReason('');
        clearInventoryDraft('checkup', tenantCode, salesPointId, DEFAULT_DRAFT_KEY);
      } catch (err: unknown) {
        if (isInventoryConflictError(err)) {
          setConflict({
            kind: isCheckupStockMovedCode(err.code) ? 'STOCK_MOVED' : 'BELOW_HOLD',
            message: err.message,
            staleLines: err.staleLines,
            holdFloorLines: err.holdFloorLines,
          });
          setStatusTone('warn');
          setStatusMessage(
            isCheckupStockMovedCode(err.code)
              ? t('pickup.checkup.conflictStockMoved')
              : t('pickup.checkup.conflictBelowHold'),
          );
        } else {
          setStatusTone('danger');
          setStatusMessage(
            err instanceof Error ? err.message : t('pickup.checkup.applyFailed'),
          );
        }
      } finally {
        setApplying(false);
      }
    })();
  }, [accessToken, draft.lines.length, draft.serverCheckupId, gateway, salesPointId, t, tenantCode]);

  const retryApplyWithOverride = useCallback((): void => {
    if (!isPickupOnline()) {
      setIsOnline(false);
      setStatusTone('warn');
      setStatusMessage(t('pickup.checkup.offlineApplyBlocked'));
      return;
    }
    if (
      accessToken === null ||
      draft.serverCheckupId === null ||
      conflict === null ||
      !canOverrideHoldFloor
    ) {
      return;
    }
    const reason = overrideReason.trim();
    if (reason.length === 0) {
      setStatusTone('warn');
      setStatusMessage(t('pickup.checkup.overrideReasonRequired'));
      return;
    }
    setApplying(true);
    setStatusMessage(null);
    void gateway
      .applyCheckup(
        tenantCode,
        accessToken,
        draft.serverCheckupId,
        generateInventoryIdempotencyKey(),
        {
          overrideMovedLines: true,
          overrideReason: reason,
        },
      )
      .then((result) => {
        setStatusTone('success');
        setStatusMessage(
          result.incidentOpened
            ? t('pickup.checkup.applySuccessIncident')
            : t('pickup.checkup.applySuccess'),
        );
        setConflict(null);
        setOverrideReason('');
        setDraft(emptyDraft(generateClientDraftKey('checkup')));
        clearInventoryDraft('checkup', tenantCode, salesPointId, DEFAULT_DRAFT_KEY);
      })
      .catch((err: unknown) => {
        if (isInventoryConflictError(err)) {
          setConflict({
            kind: isCheckupStockMovedCode(err.code) ? 'STOCK_MOVED' : 'BELOW_HOLD',
            message: err.message,
            staleLines: err.staleLines,
            holdFloorLines: err.holdFloorLines,
          });
          setStatusTone('warn');
          setStatusMessage(
            isCheckupStockMovedCode(err.code)
              ? t('pickup.checkup.conflictStockMoved')
              : t('pickup.checkup.conflictBelowHold'),
          );
          return;
        }
        setStatusTone('danger');
        setStatusMessage(err instanceof Error ? err.message : t('pickup.checkup.applyFailed'));
      })
      .finally(() => {
        setApplying(false);
      });
  }, [
    accessToken,
    canOverrideHoldFloor,
    conflict,
    draft.serverCheckupId,
    gateway,
    overrideReason,
    salesPointId,
    t,
    tenantCode,
  ]);

  const viewModel = useMemo(
    () =>
      buildCheckupViewModel({
        tenantCode,
        canResupply,
        canOverrideHoldFloor,
        isOnline,
        statusMessage,
        statusTone,
        draft,
        starting,
        applying,
        refreshing,
        conflict,
        overrideReason,
        resumeCandidates,
        selectedResumeId,
      }),
    [
      applying,
      canOverrideHoldFloor,
      canResupply,
      conflict,
      draft,
      isOnline,
      overrideReason,
      resumeCandidates,
      refreshing,
      selectedResumeId,
      starting,
      statusMessage,
      statusTone,
      tenantCode,
    ],
  );

  const actions = useMemo<CheckupScreenActions>(
    () => ({
      retryOnlineCheck: (): void => {
        setIsOnline(isPickupOnline());
        setStatusMessage(null);
      },
      startCheckup,
      incrementCounted: (lineId): void => {
        updateLocalLine(lineId, (line) => ({
          ...line,
          countedQuantity:
            line.countedQuantity === null
              ? line.expectedQuantity
              : line.countedQuantity + 1,
        }));
      },
      decrementCounted: (lineId): void => {
        updateLocalLine(lineId, (line) => {
          const current =
            line.countedQuantity === null
              ? line.expectedQuantity
              : line.countedQuantity;
          return {
            ...line,
            countedQuantity: Math.max(0, current - 1),
          };
        });
      },
      setShrinkageReason: (lineId, reason): void => {
        updateLocalLine(lineId, (line) => ({
          ...line,
          shrinkageReason: reason,
        }));
      },
      attemptApply,
      setOverrideReason: (reason): void => {
        setOverrideReason(reason);
      },
      retryApplyWithOverride,
      refreshSnapshot,
      selectResumeCheckup: (checkupId): void => {
        setSelectedResumeId(checkupId);
      },
      resumeSelectedCheckup,
      dismissStatus: (): void => {
        setStatusMessage(null);
      },
      dismissConflict: (): void => {
        setConflict(null);
        setOverrideReason('');
      },
    }),
    [
      attemptApply,
      refreshSnapshot,
      resumeSelectedCheckup,
      retryApplyWithOverride,
      startCheckup,
      updateLocalLine,
    ],
  );

  return { accessToken, tenantCode, canResupply, viewModel, actions };
}
