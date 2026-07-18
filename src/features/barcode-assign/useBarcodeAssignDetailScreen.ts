import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { useBarcodeAssignScanner } from './hooks/useBarcodeAssignScanner.js';
import { useDebouncedBarcodeCheck } from './hooks/useDebouncedBarcodeCheck.js';
import type { BarcodeAssignCatalogItem, ProductBarcodeStateDTO } from '../../gateway/productBarcode.gateway.js';
import { buildBarcodeAssignDetailPath } from './buildBarcodeAssignViewModel.js';
import {
  buildBarcodeAssignDetailViewModel,
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

export interface BarcodeAssignDetailScreenActions {
  readonly setDraftCode: (value: string) => void;
  readonly startCamera: () => void;
  readonly save: (event: FormEvent) => void;
  readonly requestClear: () => void;
  readonly cancelClear: () => void;
  readonly confirmClear: () => void;
  readonly openVariant: (variantId: number) => void;
}

export interface UseBarcodeAssignDetailScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canAssign: boolean;
  readonly entitlementLoading: boolean;
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
  const navigate = useNavigate();
  const { productId: productIdParam, variantId: variantIdParam } = useParams();
  const productId = Number(productIdParam);
  const routeVariantId = parsePositiveInt(variantIdParam);
  const { t } = useTranslation();
  const { entitledFunctions, isLoading: entitlementLoading } = usePickupEntitlement(tenantCode);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [catalogVariants, setCatalogVariants] = useState<readonly BarcodeAssignCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [draftCode, setDraftCode] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [state, setState] = useState<ProductBarcodeStateDTO | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);
  const variantId = routeVariantId;
  const needsVariantPicker = catalogVariants.length > 1 && variantId === undefined;
  const productIdValid = Number.isFinite(productId) && productId > 0;

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

  const handleDecode = useCallback((raw: string) => {
    setDraftCode(raw.trim());
    setCameraEnabled(false);
  }, []);

  useBarcodeAssignScanner({
    enabled: cameraEnabled && accessToken !== null && !needsVariantPicker,
    videoRef,
    onDecode: handleDecode,
    formatProfile: 'all',
  });

  useEffect(() => {
    if (!accessToken || !productIdValid) {
      return;
    }
    let cancelled = false;
    void gateway
      .listCatalog(tenantCode, accessToken)
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setCatalogVariants(rows.filter((row) => row.productId === productId && row.variantId !== undefined));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCatalogVariants([]);
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, gateway, productId, productIdValid, tenantCode]);

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
          setDraftCode(next.barcode ?? '');
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
  }, [accessToken, gateway, needsVariantPicker, productId, productIdValid, tenantCode, variantId]);

  const artifactLinearUrl = gateway.productBarcodeArtifactUrl(
    tenantCode,
    productId,
    'linear',
    variantId,
  );
  const artifactQrUrl = gateway.productBarcodeArtifactUrl(tenantCode, productId, 'qr', variantId);

  const viewModel = useMemo(
    () =>
      buildBarcodeAssignDetailViewModel({
        tenantCode,
        productId,
        variantId,
        catalogVariants,
        catalogLoading,
        draftCode,
        cameraEnabled,
        debouncedChecking: debouncedCheck.isChecking,
        checkResult: debouncedCheck.result,
        confirmOverwrite,
        isSaving,
        saveError,
        state,
        confirmClear,
        artifactLinearUrl,
        artifactQrUrl,
      }),
    [
      artifactLinearUrl,
      artifactQrUrl,
      cameraEnabled,
      catalogLoading,
      catalogVariants,
      confirmClear,
      confirmOverwrite,
      debouncedCheck.isChecking,
      debouncedCheck.result,
      draftCode,
      isSaving,
      productId,
      saveError,
      state,
      tenantCode,
      variantId,
    ],
  );

  const save = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      if (!accessToken || !viewModel.canSave) {
        return;
      }
      setIsSaving(true);
      setSaveError(null);
      void gateway
        .assignPrimaryBarcode(tenantCode, accessToken, productId, {
          code: draftCode.trim(),
          variantId,
          confirmOverwrite: confirmOverwrite || undefined,
        })
        .then((next) => {
          setState(next);
          setConfirmOverwrite(false);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.message === 'BARCODE_CONFLICT') {
            setConfirmOverwrite(true);
            setSaveError(t('pickup.barcodeAssign.conflictWarning'));
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
      confirmOverwrite,
      draftCode,
      gateway,
      productId,
      t,
      tenantCode,
      variantId,
      viewModel.canSave,
    ],
  );

  const confirmClearAction = useCallback((): void => {
    if (!accessToken || (variantId === undefined && catalogVariants.length > 0)) {
      return;
    }
    void gateway.clearPrimaryBarcode(tenantCode, accessToken, productId, variantId).then((next) => {
      setState(next);
      setDraftCode('');
      setConfirmOverwrite(false);
      setConfirmClear(false);
    });
  }, [accessToken, catalogVariants.length, gateway, productId, tenantCode, variantId]);

  const actions = useMemo<BarcodeAssignDetailScreenActions>(
    () => ({
      setDraftCode: (value: string) => {
        setDraftCode(value);
        setConfirmOverwrite(false);
      },
      startCamera: () => setCameraEnabled(true),
      save,
      requestClear: () => setConfirmClear(true),
      cancelClear: () => setConfirmClear(false),
      confirmClear: confirmClearAction,
      openVariant: (nextVariantId: number) => {
        navigate(buildBarcodeAssignDetailPath(tenantCode, productId, nextVariantId));
      },
    }),
    [confirmClearAction, navigate, productId, save, tenantCode],
  );

  return {
    accessToken,
    tenantCode,
    canAssign,
    entitlementLoading,
    productIdValid,
    viewModel,
    actions,
    videoRef,
  };
}
