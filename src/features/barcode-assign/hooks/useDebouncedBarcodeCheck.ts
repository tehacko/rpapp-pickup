import { useCallback, useEffect, useRef, useState } from 'react';
import type { BarcodeAssignCheckResult } from '../../../gateway/productBarcode.gateway.js';

const DEFAULT_DEBOUNCE_MS = 300;

export interface UseDebouncedBarcodeCheckOptions {
  readonly code: string;
  readonly productId: number;
  readonly variantId?: number;
  readonly enabled: boolean;
  readonly debounceMs?: number;
  readonly checkFn: (input: {
    code: string;
    productId: number;
    variantId?: number;
  }) => Promise<BarcodeAssignCheckResult>;
}

export interface UseDebouncedBarcodeCheckResult {
  readonly result: BarcodeAssignCheckResult | null;
  readonly isChecking: boolean;
  readonly error: string | null;
  /**
   * Drops trust in the current result and re-runs the debounced check for the
   * active draft scope (e.g. after a successful barcode move). Save stays blocked
   * until a fresh `available: true` returns for the same code+productId+variantId.
   */
  readonly clearTrustedResult: () => void;
  /** Alias of `clearTrustedResult` (G6 consumers). */
  readonly invalidate: () => void;
}

function buildDraftScopeKey(
  trimmed: string,
  productId: number,
  variantId: number | undefined,
  gapGeneration: number,
  checkEpoch: number,
): string {
  return `${trimmed}\0${String(productId)}\0${variantId === undefined ? '' : String(variantId)}\0${String(gapGeneration)}\0${String(checkEpoch)}`;
}

/**
 * Debounced assign pre-check. Result is only trusted when it matches the current
 * draft scope (trimmed code + productId + variantId + invalidate epoch) — never
 * leave a stale `available: true` while the draft or target product/variant changed.
 *
 * Trust is derived in render from the scope key (no sync-clear `setState` when
 * `!shouldCheck`). On check error, the scope is marked completed so `isChecking`
 * becomes false and `error` surfaces for the current draft.
 */
export function useDebouncedBarcodeCheck(
  options: UseDebouncedBarcodeCheckOptions,
): UseDebouncedBarcodeCheckResult {
  const {
    code,
    productId,
    variantId,
    enabled,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    checkFn,
  } = options;

  const trimmed = code.trim();
  const shouldCheck = enabled && trimmed.length > 0;

  const [result, setResult] = useState<BarcodeAssignCheckResult | null>(null);
  const [trustedScopeKey, setTrustedScopeKey] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEpoch, setCheckEpoch] = useState(0);
  const [gapGeneration, setGapGeneration] = useState(0);
  const checkFnRef = useRef(checkFn);
  const prevShouldCheckRef = useRef(shouldCheck);

  // G5: clear-then-retype same code must not reuse prior available:true.
  useEffect(() => {
    if (prevShouldCheckRef.current && !shouldCheck) {
      setGapGeneration((prev) => prev + 1);
    }
    prevShouldCheckRef.current = shouldCheck;
  }, [shouldCheck]);

  const draftScopeKey = shouldCheck
    ? buildDraftScopeKey(trimmed, productId, variantId, gapGeneration, checkEpoch)
    : null;

  useEffect(() => {
    checkFnRef.current = checkFn;
  }, [checkFn]);

  const clearTrustedResult = useCallback((): void => {
    setCheckEpoch((prev) => prev + 1);
  }, [setCheckEpoch]);

  useEffect(() => {
    if (!shouldCheck || draftScopeKey === null) {
      return;
    }

    let cancelled = false;
    const requestScopeKey = draftScopeKey;

    const handle = setTimeout(() => {
      if (cancelled) {
        return;
      }
      setInFlight(true);
      void (async (): Promise<void> => {
        try {
          const next = await checkFnRef.current({
            code: trimmed,
            productId,
            variantId,
          });
          if (cancelled) {
            return;
          }
          setResult(next);
          setTrustedScopeKey(requestScopeKey);
          setError(null);
        } catch (err) {
          if (cancelled) {
            return;
          }
          // G7: mark this scope completed so isChecking clears and error surfaces.
          setResult(null);
          setTrustedScopeKey(requestScopeKey);
          setError(err instanceof Error ? err.message : 'Check failed');
        } finally {
          if (!cancelled) {
            setInFlight(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmed, productId, variantId, shouldCheck, debounceMs, draftScopeKey, checkEpoch]);

  if (!shouldCheck || draftScopeKey === null) {
    return {
      result: null,
      isChecking: false,
      error: null,
      clearTrustedResult,
      invalidate: clearTrustedResult,
    };
  }

  const resultMatchesDraft = trustedScopeKey === draftScopeKey;
  const isChecking = inFlight || !resultMatchesDraft;

  return {
    result: resultMatchesDraft ? result : null,
    isChecking,
    error: resultMatchesDraft ? error : null,
    clearTrustedResult,
    invalidate: clearTrustedResult,
  };
}
