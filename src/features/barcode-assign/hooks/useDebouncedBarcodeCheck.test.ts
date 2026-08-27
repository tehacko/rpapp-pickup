import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDebouncedBarcodeCheck } from './useDebouncedBarcodeCheck.js';

describe('useDebouncedBarcodeCheck', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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
    expect(result.current.result).toBeNull();
    expect(checkFn).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(checkFn).toHaveBeenCalledWith({
        code: '1234567890123',
        productId: 42,
        variantId: undefined,
      });
    });

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
      expect(result.current.result?.available).toBe(true);
    });

    jest.useRealTimers();
  });

  it('invalidates stale available result when code changes', async () => {
    jest.useFakeTimers();
    const checkFn = jest
      .fn<() => Promise<{ available: boolean; conflict?: { holderType: 'product'; productId: number; productName: string; barcode: string } }>>()
      .mockResolvedValueOnce({ available: true })
      .mockResolvedValueOnce({
        available: false,
        conflict: {
          holderType: 'product',
          productId: 9,
          productName: 'Taken',
          barcode: 'CONFLICT',
        },
      });

    const { result, rerender } = renderHook(
      ({ code }) =>
        useDebouncedBarcodeCheck({
          code,
          productId: 42,
          enabled: true,
          debounceMs: 300,
          checkFn,
        }),
      { initialProps: { code: 'FREE' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
    });

    rerender({ code: 'CONFLICT' });
    expect(result.current.isChecking).toBe(true);
    expect(result.current.result).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(false);
      expect(result.current.isChecking).toBe(false);
    });

    jest.useRealTimers();
  });

  it('invalidates trusted result when productId or variantId changes (G5)', async () => {
    jest.useFakeTimers();
    const checkFn = jest
      .fn<() => Promise<{ available: boolean }>>()
      .mockResolvedValue({ available: true });

    const { result, rerender } = renderHook(
      ({ productId, variantId }: { productId: number; variantId?: number }) =>
        useDebouncedBarcodeCheck({
          code: 'SAME',
          productId,
          variantId,
          enabled: true,
          debounceMs: 300,
          checkFn,
        }),
      { initialProps: { productId: 1, variantId: undefined as number | undefined } },
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
      expect(result.current.isChecking).toBe(false);
    });

    rerender({ productId: 2, variantId: undefined });
    expect(result.current.isChecking).toBe(true);
    expect(result.current.result).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
      expect(result.current.isChecking).toBe(false);
    });

    rerender({ productId: 2, variantId: 9 });
    expect(result.current.isChecking).toBe(true);
    expect(result.current.result).toBeNull();

    jest.useRealTimers();
  });

  it('invalidates after clear-then-retype of the same code (G5)', async () => {
    jest.useFakeTimers();
    const checkFn = jest
      .fn<() => Promise<{ available: boolean }>>()
      .mockResolvedValue({ available: true });

    const { result, rerender } = renderHook(
      ({ code }) =>
        useDebouncedBarcodeCheck({
          code,
          productId: 42,
          enabled: true,
          debounceMs: 300,
          checkFn,
        }),
      { initialProps: { code: 'RETYPE' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
    });

    rerender({ code: '   ' });
    expect(result.current.result).toBeNull();
    expect(result.current.isChecking).toBe(false);

    rerender({ code: 'RETYPE' });
    expect(result.current.isChecking).toBe(true);
    expect(result.current.result).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
      expect(result.current.isChecking).toBe(false);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('on check error marks scope complete, surfaces error, and clears isChecking (G7)', async () => {
    jest.useFakeTimers();
    const checkFn = jest.fn(async () => {
      throw new Error('network down');
    });

    const { result } = renderHook(() =>
      useDebouncedBarcodeCheck({
        code: 'ERRCODE',
        productId: 42,
        enabled: true,
        debounceMs: 300,
        checkFn,
      }),
    );

    expect(result.current.isChecking).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBe('network down');
    });

    jest.useRealTimers();
  });

  it('clearTrustedResult drops trust and re-runs check (G6)', async () => {
    jest.useFakeTimers();
    const checkFn = jest
      .fn<() => Promise<{ available: boolean }>>()
      .mockResolvedValue({ available: true });

    const { result } = renderHook(() =>
      useDebouncedBarcodeCheck({
        code: 'MOVE',
        productId: 42,
        enabled: true,
        debounceMs: 300,
        checkFn,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
      expect(result.current.isChecking).toBe(false);
    });

    act(() => {
      result.current.clearTrustedResult();
    });
    expect(result.current.isChecking).toBe(true);
    expect(result.current.result).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current.result?.available).toBe(true);
      expect(result.current.isChecking).toBe(false);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
