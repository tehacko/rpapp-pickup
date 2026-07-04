import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../hub/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { useBarcodeAssignScanner } from './hooks/useBarcodeAssignScanner.js';
import { useDebouncedBarcodeCheck } from './hooks/useDebouncedBarcodeCheck.js';
import {
  assignPrimaryBarcode,
  checkBarcodeAssign,
  clearPrimaryBarcode,
  getProductBarcode,
  listProductsForBarcodeAssign,
  productBarcodeArtifactUrl,
  type BarcodeAssignCatalogItem,
  type ProductBarcodeStateDTO,
} from '../../gateway/productBarcode.gateway.js';

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

export function BarcodeAssignDetailPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { productId: productIdParam, variantId: variantIdParam } = useParams();
  const productId = Number(productIdParam);
  const routeVariantId = parsePositiveInt(variantIdParam);
  const { t } = useTranslation();
  const { entitledFunctions } = usePickupEntitlement(tenantCode);
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

  const selectedVariantLabel = useMemo(() => {
    if (variantId === undefined) {
      return null;
    }
    const row = catalogVariants.find((item) => item.variantId === variantId);
    return row?.variantName ?? row?.name ?? null;
  }, [catalogVariants, variantId]);

  const checkFn = useCallback(
    async (input: { code: string; productId: number; variantId?: number }) => {
      if (!accessToken) {
        throw new Error('Missing token');
      }
      return checkBarcodeAssign(tenantCode, accessToken, input);
    },
    [accessToken, tenantCode],
  );

  const debouncedCheck = useDebouncedBarcodeCheck({
    code: draftCode,
    productId,
    variantId,
    enabled: Number.isFinite(productId) && productId > 0 && !needsVariantPicker,
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
    if (!accessToken || !Number.isFinite(productId)) {
      return;
    }

    let cancelled = false;
    void listProductsForBarcodeAssign(tenantCode, accessToken)
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
  }, [accessToken, productId, tenantCode]);

  useEffect(() => {
    if (!accessToken || !Number.isFinite(productId) || needsVariantPicker) {
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void getProductBarcode(tenantCode, accessToken, productId, variantId)
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
  }, [accessToken, needsVariantPicker, productId, tenantCode, variantId]);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (!canAssign || !Number.isFinite(productId) || productId <= 0) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/barcode-assign`} replace />;
  }

  const conflict = debouncedCheck.result?.available === false ? debouncedCheck.result.conflict : undefined;
  const canSave =
    draftCode.trim().length > 0 &&
    !debouncedCheck.isChecking &&
    !needsVariantPicker &&
    (debouncedCheck.result?.available === true || confirmOverwrite);

  async function onSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken || !canSave) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const next = await assignPrimaryBarcode(tenantCode, accessToken, productId, {
        code: draftCode.trim(),
        variantId,
        confirmOverwrite: confirmOverwrite || undefined,
      });
      setState(next);
      setConfirmOverwrite(false);
    } catch (err) {
      if (err instanceof Error && err.message === 'BARCODE_CONFLICT') {
        setConfirmOverwrite(true);
        setSaveError(t('pickup.barcodeAssign.conflictWarning'));
        return;
      }
      setSaveError(err instanceof Error ? err.message : t('pickup.barcodeAssign.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  async function onClearConfirmed(): Promise<void> {
    if (!accessToken || variantId === undefined && catalogVariants.length > 0) {
      return;
    }
    const next = await clearPrimaryBarcode(tenantCode, accessToken, productId, variantId);
    setState(next);
    setDraftCode('');
    setConfirmOverwrite(false);
    setConfirmClear(false);
  }

  const artifactLinear = productBarcodeArtifactUrl(tenantCode, productId, 'linear', variantId);
  const artifactQr = productBarcodeArtifactUrl(tenantCode, productId, 'qr', variantId);

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.barcodeAssign.detailTitle', { productId })}</h1>
      {selectedVariantLabel ? (
        <p className="pickup-message">{t('pickup.barcodeAssign.variantSelected', { name: selectedVariantLabel })}</p>
      ) : null}
      <p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/barcode-assign`}>
          {t('pickup.barcodeAssign.backToList')}
        </Link>
      </p>

      {needsVariantPicker ? (
        <section className="pickup-panel pickup-stack">
          <h2 className="pickup-subtitle">{t('pickup.barcodeAssign.chooseVariant')}</h2>
          {catalogLoading ? <p role="status">{t('pickup.barcodeAssign.loading')}</p> : null}
          <ul className="pickup-stack">
            {catalogVariants.map((item) => (
              <li key={item.variantId}>
                <button
                  className="pickup-button pickup-button--secondary"
                  type="button"
                  disabled={!item.assignable || item.isArchived}
                  onClick={() => {
                    navigate(
                      `/${encodeURIComponent(tenantCode)}/barcode-assign/${encodeURIComponent(String(productId))}/variants/${encodeURIComponent(String(item.variantId))}`,
                    );
                  }}
                >
                  {item.variantName ?? item.name}
                  {item.barcode ? ` — ${item.barcode}` : ''}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!needsVariantPicker ? (
        <>
          <section className="pickup-panel pickup-stack">
            <video ref={videoRef} className="pickup-scan-video" muted playsInline />
            {cameraEnabled ? null : (
              <button
                className="pickup-button pickup-button--secondary"
                type="button"
                onClick={() => setCameraEnabled(true)}
              >
                {t('pickup.scan.startCamera')}
              </button>
            )}
          </section>

          <form className="pickup-stack" onSubmit={(event) => void onSave(event)}>
            <label className="pickup-label" htmlFor="pickup-barcode-code">
              {t('pickup.barcodeAssign.codeLabel')}
              <input
                id="pickup-barcode-code"
                className="pickup-input"
                value={draftCode}
                onChange={(event) => {
                  setDraftCode(event.target.value);
                  setConfirmOverwrite(false);
                }}
              />
            </label>
            {debouncedCheck.isChecking ? <p role="status">{t('pickup.barcodeAssign.checking')}</p> : null}
            {debouncedCheck.result?.canonical ? (
              <p>{t('pickup.barcodeAssign.canonical', { value: debouncedCheck.result.canonical })}</p>
            ) : null}
            {conflict ? (
              <p className="pickup-message pickup-message--warn" role="alert">
                {t('pickup.barcodeAssign.conflictWarning', { name: conflict.productName })}
              </p>
            ) : null}
            {confirmOverwrite ? (
              <p className="pickup-message pickup-message--warn">{t('pickup.barcodeAssign.confirmOverwrite')}</p>
            ) : null}
            <button className="pickup-button" type="submit" disabled={!canSave || isSaving}>
              {t('pickup.barcodeAssign.save')}
            </button>
          </form>

          {saveError ? <p className="pickup-message pickup-message--error">{saveError}</p> : null}

          {state?.barcode ? (
            <section className="pickup-panel pickup-stack">
              <p>{t('pickup.barcodeAssign.current', { value: state.barcode })}</p>
              <img src={artifactLinear} alt={t('pickup.barcodeAssign.artifactLinear')} />
              <img src={artifactQr} alt={t('pickup.barcodeAssign.artifactQr')} />
              {confirmClear ? (
                <div className="pickup-stack">
                  <p>{t('pickup.barcodeAssign.clearConfirm')}</p>
                  <div className="pickup-row">
                    <button
                      className="pickup-button pickup-button--secondary"
                      type="button"
                      onClick={() => void onClearConfirmed()}
                    >
                      {t('pickup.barcodeAssign.clearConfirmAction')}
                    </button>
                    <button
                      className="pickup-button pickup-button--secondary"
                      type="button"
                      onClick={() => setConfirmClear(false)}
                    >
                      {t('pickup.barcodeAssign.clearCancelAction')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="pickup-button pickup-button--secondary"
                  type="button"
                  onClick={() => setConfirmClear(true)}
                >
                  {t('pickup.barcodeAssign.clear')}
                </button>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
