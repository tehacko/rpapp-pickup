import { useEffect, useRef, useState } from 'react';
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
}

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
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkFnRef = useRef(checkFn);

  useEffect(() => {
    checkFnRef.current = checkFn;
  }, [checkFn]);

  useEffect(() => {
    if (!shouldCheck) {
      return;
    }

    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) {
        return;
      }
      setIsChecking(true);
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
          setError(null);
        } catch (err) {
          if (cancelled) {
            return;
          }
          setResult(null);
          setError(err instanceof Error ? err.message : 'Check failed');
        } finally {
          if (!cancelled) {
            setIsChecking(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmed, productId, variantId, shouldCheck, debounceMs]);

  if (!shouldCheck) {
    return { result: null, isChecking: false, error: null };
  }

  return { result, isChecking, error };
}
