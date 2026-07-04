import { describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebouncedBarcodeCheck } from './useDebouncedBarcodeCheck.js';

describe('useDebouncedBarcodeCheck', () => {
  it('debounces barcode assign pre-check before exposing result', async () => {
    jest.useFakeTimers();
    const checkFn = jest.fn(async () => ({ available: true, canonical: '1234567890123' }));

    const { result, rerender } = renderHook(
      ({ code }) =>
        useDebouncedBarcodeCheck({
          code,
          productId: 42,
          enabled: true,
          debounceMs: 300,
          checkFn,
        }),
      { initialProps: { code: '' } },
    );

    rerender({ code: '1234567890123' });
    expect(result.current.isChecking).toBe(true);
    expect(checkFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(checkFn).toHaveBeenCalledWith({
        code: '1234567890123',
        productId: 42,
        variantId: undefined,
      });
    });

    jest.useRealTimers();
  });
});
