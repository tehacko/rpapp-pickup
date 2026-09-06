import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { usePickupLocaleTag } from '../../shared/hooks/usePickupLocaleTag.js';
import { useBarcodeAssignScanner } from './hooks/useBarcodeAssignScanner.js';
import { resolvePickupCameraRunningMessage } from '../../lib/pickupCameraRunningMessage.js';
import { useDebouncedBarcodeCheck } from './hooks/useDebouncedBarcodeCheck.js';
import type {
  BarcodeAssignCatalogItem,
  BarcodeAssignCheckResult,
  BarcodeConflictDTO,
  ProductBarcodeStateDTO,
} from '../../gateway/productBarcode.gateway.js';
import { buildBarcodeAssignDetailPath } from './buildBarcodeAssignViewModel.js';
import {
  buildBarcodeAssignDetailViewModel,
  resolveBarcodeAssignPrimaryLocked,
  type BarcodeAssignDetailViewModel,
} from './buildBarcodeAssignDetailViewModel.js';
import type { IBarcodeAssignGateway } from './IBarcodeAssignGateway.js';
import { barcodeAssignGateway } from './barcodeAssignGateway.js';

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function readAssignConflict(err: unknown): {
  readonly isConflict: boolean;
  readonly conflict: BarcodeConflictDTO | undefined;
} {
  if (!(err instanceof Error) || err.message !== 'BARCODE_CONFLICT') {
    return { isConflict: false, conflict: undefined };
  }
  const conflict = (err as Error & { conflict?: BarcodeConflictDTO }).conflict;
  return {
    isConflict: true,
    conflict:
      conflict !== undefined &&
      Number.isFinite(conflict.productId) &&
      conflict.productId > 0
        ? conflict
        : undefined,
  };
}

function seedConflictCheckResult(
  conflict: BarcodeConflictDTO | undefined,
): BarcodeAssignCheckResult {
  if (conflict === undefined) {
    return { available: false };
  }
  return { available: false, conflict };
}

export interface BarcodeAssignDetailScreenActions {
  readonly setDraftCode: (value: string) => void;
  readonly startCamera: () => void;
  readonly retryCamera: () => void;
  readonly applyCameraDecode: (raw: string) => void;
  readonly save: (event: FormEvent) => void;
  readonly armOrConfirmMove: () => void;
  readonly cancelMove: () => void;
  readonly openConflictProduct: () => void;
  readonly retryConflictCheck: () => void;
  readonly requestClear: () => void;
  readonly cancelClear: () => void;
  readonly confirmClear: () => void;
  /** Spec Lock — remove an alternate barcode (never mutates locked primary). */
  readonly removeAlt: (code: string) => void;
  readonly openVariant: (variantId: number) => void;
  readonly retryCatalog: () => void;
}

export interface UseBarcodeAssignDetailScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canAssign: boolean;
  readonly entitlementLoading: boolean;
  readonly entitlementIsError: boolean;
  readonly retryEntitlement: () => void;
  readonly productIdValid: boolean;
  readonly viewModel: BarcodeAssignDetailViewModel;
  readonly actions: BarcodeAssignDetailScreenActions;
  readonly videoRef: React.Ref<HTMLVideoElement>;
}

export function useBarcodeAssignDetailScreen(
  gateway: IBarcodeAssignGateway = barcodeAssignGateway,
): UseBarcodeAssignDetailScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { sessionClaims } = usePickupStaffSession();
  const staffSalesPointId =
    sessionClaims?.salesPointId != null &&
    Number.isFinite(sessionClaims.salesPointId) &&
    sessionClaims.salesPointId > 0
      ? sessionClaims.salesPointId
      : null;
  const navigate = useNavigate();
  const { productId: productIdParam, variantId: variantIdParam } = useParams();
  const productId = Number(productIdParam);
  const routeVariantId = parsePositiveInt(variantIdParam);
  const { t } = useTranslation();
  const localeTag = usePickupLocaleTag();
  const { entitledFunctions, isLoading: entitlementLoading, isError: entitlementIsError, refetch: refetchEntitlement } =
    usePickupEntitlement(tenantCode);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** When true, late getProductBarcode must not wipe an in-progress draft (G14 race). */
  const draftTouchedRef = useRef(false);
  const confirmOverwriteRef = useRef(false);

  const [catalogVariants, setCatalogVariants] = useState<readonly BarcodeAssignCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);
  const [draftCode, setDraftCodeState] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [state, setState] = useState<ProductBarcodeStateDTO | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  /** G3/G8 — 409 payload seeds conflict UI even when debounced check still says available:true. */
  const [checkOverride, setCheckOverride] = useState<BarcodeAssignCheckResult | null>(null);

  const setConfirmOverwriteSynced = useCallback((value: boolean): void => {
    confirmOverwriteRef.current = value;
    setConfirmOverwrite(value);
  }, []);

  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);
  const variantId = routeVariantId;
  const needsVariantPicker = catalogVariants.length > 1 && variantId === undefined;
  const productIdValid = Number.isFinite(productId) && productId > 0;
  const primaryLocked = resolveBarcodeAssignPrimaryLocked({
    autoUrlQrPolicyEntitled: canAssign,
    variantId,
    catalogVariants,
    barcode: state?.barcode,
    slug: state?.slug,
  });

  useEffect(() => {
    draftTouchedRef.current = false;
  }, [productId, variantId]);

  const setDraftCode = useCallback((value: string): void => {
    draftTouchedRef.current = true;
    confirmOverwriteRef.current = false;
    setDraftCodeState(value);
    setConfirmOverwriteSynced(false);
    setCheckOverride(null);
  }, [setCheckOverride, setConfirmOverwriteSynced, setDraftCodeState]);

  const checkFn = useCallback(
    async (input: { code: string; productId: number; variantId?: number }) => {
      if (!accessToken) {
        throw new Error('Missing token');
      }
      return gateway.checkBarcode(tenantCode, accessToken, input);
    },
    [accessToken, gateway, tenantCode],
  );

  const debouncedCheck = useDebouncedBarcodeCheck({
    code: draftCode,
    productId,
    variantId,
    enabled: productIdValid && !needsVariantPicker,
    checkFn,
  });
  const {
    result: debouncedCheckResult,
    isChecking: debouncedCheckIsChecking,
    error: debouncedCheckError,
    clearTrustedResult,
  } = debouncedCheck;

  const effectiveCheckResult = checkOverride ?? debouncedCheckResult;

  const handleDecode = useCallback((raw: string) => {
    setDraftCode(raw.trim());
    setCameraEnabled(false);
  }, [setCameraEnabled, setDraftCode]);

  const handleBackgroundStop = useCallback((): void => {
    setCameraEnabled(false);
  }, [setCameraEnabled]);

  const {
    status: cameraStatus,
    engine: cameraEngine,
    zxingAssistActive,
    degradedMode: cameraDegradedMode,
    errorMessage: cameraError,
  } = useBarcodeAssignScanner({
    enabled: cameraEnabled && accessToken !== null && !needsVariantPicker,
    videoRef,
    onDecode: handleDecode,
    formatProfile: 'all',
    onBackgroundStop: handleBackgroundStop,
    sessionKey: cameraSessionKey,
  });

  useEffect(() => {
    if (!accessToken || !productIdValid) {
      return;
    }
    let cancelled = false;
    const loadCatalog = async (): Promise<void> => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const rows = await gateway.listCatalog(tenantCode, accessToken);
        if (cancelled) {
          return;
        }
        setCatalogVariants(
          rows.filter((row) => row.productId === productId && row.variantId !== undefined),
        );
        setCatalogError(null);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        setCatalogVariants([]);
        setCatalogError(
          err instanceof Error ? err.message : t('pickup.barcodeAssign.loadFailed'),
        );
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [accessToken, catalogReloadToken, gateway, productId, productIdValid, t, tenantCode]);

  useEffect(() => {
    if (!accessToken || !productIdValid || needsVariantPicker) {
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void gateway
        .getProductBarcode(tenantCode, accessToken, productId, variantId)
        .then((next) => {
          if (cancelled) {
            return;
          }
          setState(next);
          // Do not clobber a draft the user (or scan) already entered while load was in flight.
          if (!draftTouchedRef.current) {
            // Spec Lock — locked primary is display-only; drafts are alt codes only.
            const locked = resolveBarcodeAssignPrimaryLocked({
              autoUrlQrPolicyEntitled: canAssign,
              variantId,
              catalogVariants,
              barcode: next.barcode,
              slug: next.slug,
            });
            setDraftCodeState(locked ? '' : (next.barcode ?? ''));
            setCheckOverride(null);
            setConfirmOverwriteSynced(false);
          }
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setState(null);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    accessToken,
    canAssign,
    catalogVariants,
    gateway,
    needsVariantPicker,
    productId,
    productIdValid,
    setConfirmOverwriteSynced,
    tenantCode,
    variantId,
  ]);

  const artifactQrUrl = gateway.productBarcodeArtifactUrl(tenantCode, productId, 'qr', {
    ...(variantId !== undefined ? { variantId } : {}),
    ...(staffSalesPointId != null ? { salesPointId: staffSalesPointId } : {}),
  });

  const cameraRunningMessage = useMemo(
    () =>
      resolvePickupCameraRunningMessage(
        t,
        'pickup.barcodeAssign',
        cameraStatus,
        cameraEngine,
        zxingAssistActive,
        cameraDegradedMode,
      ),
    [cameraDegradedMode, cameraEngine, cameraStatus, t, zxingAssistActive],
  );

  const viewModel = useMemo(
    () =>
      buildBarcodeAssignDetailViewModel({
        tenantCode,
        productId,
        variantId,
        catalogVariants,
        catalogLoading,
        catalogError,
        draftCode,
        cameraEnabled,
        cameraStatus,
        cameraError,
        cameraRunningMessage,
        debouncedChecking: checkOverride === null ? debouncedCheckIsChecking : false,
        checkResult: effectiveCheckResult,
        checkError: checkOverride === null ? debouncedCheckError : null,
        confirmOverwrite,
        isSaving,
        saveError,
        state,
        confirmClear,
        artifactQrUrl,
        localeTag,
        autoUrlQrPolicyEntitled: canAssign,
      }),
    [
      artifactQrUrl,
      cameraEnabled,
      cameraError,
      cameraRunningMessage,
      cameraStatus,
      canAssign,
      catalogError,
      catalogLoading,
      catalogVariants,
      checkOverride,
      confirmClear,
      confirmOverwrite,
      debouncedCheckError,
      debouncedCheckIsChecking,
      draftCode,
      effectiveCheckResult,
      isSaving,
      localeTag,
      productId,
      saveError,
      state,
      tenantCode,
      variantId,
    ],
  );

  const applySuccessfulMutation = useCallback(
    (next: ProductBarcodeStateDTO, options?: { clearDraft?: boolean }): void => {
      setState(next);
      setConfirmOverwriteSynced(false);
      setConfirmClear(false);
      setCheckOverride(null);
      clearTrustedResult();
      if (options?.clearDraft === true) {
        draftTouchedRef.current = false;
        setDraftCodeState('');
      }
    },
    [clearTrustedResult, setCheckOverride, setConfirmClear, setConfirmOverwriteSynced, setDraftCodeState, setState],
  );

  const save = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      if (!accessToken || !viewModel.canSave) {
        return;
      }
      // Spec Lock — never attempt primary mutate when auto URL-QR locks identity.
      if (primaryLocked) {
        setIsSaving(true);
        setSaveError(null);
        void gateway
          .addAltBarcode(tenantCode, accessToken, productId, {
            code: draftCode.trim(),
            variantId,
          })
          .then((next) => {
            applySuccessfulMutation(next, { clearDraft: true });
          })
          .catch((err: unknown) => {
            const { isConflict, conflict } = readAssignConflict(err);
            if (isConflict) {
              setConfirmOverwriteSynced(false);
              setCheckOverride(seedConflictCheckResult(conflict));
              setSaveError(null);
              return;
            }
            setSaveError(err instanceof Error ? err.message : t('pickup.barcodeAssign.saveFailed'));
          })
          .finally(() => {
            setIsSaving(false);
          });
        return;
      }
      setIsSaving(true);
      setSaveError(null);
      void gateway
        .assignPrimaryBarcode(tenantCode, accessToken, productId, {
          code: draftCode.trim(),
          variantId,
        })
        .then((next) => {
          applySuccessfulMutation(next);
        })
        .catch((err: unknown) => {
          const { isConflict, conflict } = readAssignConflict(err);
          if (isConflict) {
            // G3 / G8 — seed conflict UI from 409 payload; do not leave Save enabled.
            setConfirmOverwriteSynced(false);
            setCheckOverride(seedConflictCheckResult(conflict));
            setSaveError(null);
            return;
          }
          setSaveError(err instanceof Error ? err.message : t('pickup.barcodeAssign.saveFailed'));
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [
      accessToken,
      applySuccessfulMutation,
      draftCode,
      gateway,
      primaryLocked,
      productId,
      setCheckOverride,
      setConfirmOverwriteSynced,
      setIsSaving,
      setSaveError,
      t,
      tenantCode,
      variantId,
      viewModel.canSave,
    ],
  );

  const armOrConfirmMove = useCallback((): void => {
    if (!accessToken || !viewModel.canMove) {
      return;
    }
    if (!confirmOverwriteRef.current) {
      confirmOverwriteRef.current = true;
      setConfirmOverwriteSynced(true);
      setSaveError(null);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    if (primaryLocked) {
      void gateway
        .addAltBarcode(tenantCode, accessToken, productId, {
          code: draftCode.trim(),
          variantId,
          confirmOverwrite: true,
        })
        .then((next) => {
          applySuccessfulMutation(next, { clearDraft: true });
        })
        .catch((err: unknown) => {
          const { isConflict, conflict } = readAssignConflict(err);
          if (isConflict) {
            setCheckOverride(seedConflictCheckResult(conflict));
            setSaveError(null);
            return;
          }
          setSaveError(err instanceof Error ? err.message : t('pickup.barcodeAssign.saveFailed'));
        })
        .finally(() => {
          setIsSaving(false);
        });
      return;
    }
    void gateway
      .assignPrimaryBarcode(tenantCode, accessToken, productId, {
        code: draftCode.trim(),
        variantId,
        confirmOverwrite: true,
      })
      .then((next) => {
        confirmOverwriteRef.current = false;
        applySuccessfulMutation(next);
      })
      .catch((err: unknown) => {
        const { isConflict, conflict } = readAssignConflict(err);
        if (isConflict) {
          setCheckOverride(seedConflictCheckResult(conflict));
          setSaveError(null);
          return;
        }
        setSaveError(err instanceof Error ? err.message : t('pickup.barcodeAssign.saveFailed'));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }, [
    accessToken,
    applySuccessfulMutation,
    draftCode,
    gateway,
    primaryLocked,
    productId,
    setCheckOverride,
    setConfirmOverwriteSynced,
    setIsSaving,
    setSaveError,
    t,
    tenantCode,
    variantId,
    viewModel.canMove,
  ]);

  const openConflictProduct = useCallback((): void => {
    if (!viewModel.canOpenConflictProduct || viewModel.conflictProductId === undefined) {
      return;
    }
    navigate(
      buildBarcodeAssignDetailPath(tenantCode, viewModel.conflictProductId, viewModel.conflictVariantId),
    );
  }, [
    navigate,
    tenantCode,
    viewModel.canOpenConflictProduct,
    viewModel.conflictProductId,
    viewModel.conflictVariantId,
  ]);

  const retryConflictCheck = useCallback((): void => {
    setCheckOverride(null);
    setConfirmOverwriteSynced(false);
    setSaveError(null);
    clearTrustedResult();
  }, [clearTrustedResult, setCheckOverride, setConfirmOverwriteSynced, setSaveError]);

  const confirmClearAction = useCallback((): void => {
    if (!accessToken || primaryLocked || !viewModel.canClearPrimary) {
      return;
    }
    if (variantId === undefined && catalogVariants.length > 0) {
      return;
    }
    void gateway.clearPrimaryBarcode(tenantCode, accessToken, productId, variantId).then((next) => {
      applySuccessfulMutation(next, { clearDraft: true });
    });
  }, [
    accessToken,
    applySuccessfulMutation,
    catalogVariants.length,
    gateway,
    primaryLocked,
    productId,
    tenantCode,
    variantId,
    viewModel.canClearPrimary,
  ]);

  const removeAlt = useCallback(
    (code: string): void => {
      if (!accessToken || code.trim().length === 0) {
        return;
      }
      void gateway
        .removeAltBarcode(tenantCode, accessToken, productId, code.trim(), variantId)
        .then((next) => {
          applySuccessfulMutation(next);
        })
        .catch((err: unknown) => {
          setSaveError(err instanceof Error ? err.message : t('pickup.barcodeAssign.saveFailed'));
        });
    },
    [accessToken, applySuccessfulMutation, gateway, productId, setSaveError, t, tenantCode, variantId],
  );

  const actions = useMemo<BarcodeAssignDetailScreenActions>(
    () => ({
      setDraftCode,
      startCamera: () => {
        setCameraSessionKey((key) => key + 1);
        setCameraEnabled(true);
      },
      retryCamera: () => {
        setCameraSessionKey((key) => key + 1);
        setCameraEnabled(true);
      },
      applyCameraDecode: handleDecode,
      save,
      armOrConfirmMove,
      cancelMove: () => setConfirmOverwriteSynced(false),
      openConflictProduct,
      retryConflictCheck,
      requestClear: () => {
        if (primaryLocked || !viewModel.canClearPrimary) {
          return;
        }
        setConfirmClear(true);
      },
      cancelClear: () => setConfirmClear(false),
      confirmClear: confirmClearAction,
      removeAlt,
      openVariant: (nextVariantId: number) => {
        navigate(buildBarcodeAssignDetailPath(tenantCode, productId, nextVariantId));
      },
      retryCatalog: () => {
        setCatalogReloadToken((token) => token + 1);
      },
    }),
    [
      armOrConfirmMove,
      confirmClearAction,
      handleDecode,
      navigate,
      openConflictProduct,
      primaryLocked,
      productId,
      removeAlt,
      retryConflictCheck,
      save,
      setCameraEnabled,
      setCameraSessionKey,
      setCatalogReloadToken,
      setConfirmClear,
      setConfirmOverwriteSynced,
      setDraftCode,
      tenantCode,
      viewModel.canClearPrimary,
    ],
  );

  return {
    accessToken,
    tenantCode,
    canAssign,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement: refetchEntitlement,
    productIdValid,
    viewModel,
    actions,
    videoRef,
  };
}
