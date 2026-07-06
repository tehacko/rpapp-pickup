import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DEVICE_HEARTBEAT_INTERVAL_MS, useDeviceHeartbeat } from './useDeviceHeartbeat.js';

const postDeviceHeartbeat = jest.fn();
const getPairedDeviceCode = jest.fn();

jest.mock('../api/pickupApi.js', () => ({
  postDeviceHeartbeat: (...args: unknown[]) => postDeviceHeartbeat(...args),
}));

jest.mock('../lib/deviceStorage.js', () => ({
  getPairedDeviceCode: (...args: unknown[]) => getPairedDeviceCode(...args),
}));

describe('useDeviceHeartbeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    postDeviceHeartbeat.mockReset();
    getPairedDeviceCode.mockReset();
    postDeviceHeartbeat.mockResolvedValue(undefined);
    getPairedDeviceCode.mockReturnValue('DEV-001');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends heartbeat immediately and on interval when enabled', () => {
    renderHook(() => useDeviceHeartbeat('token-1', 'tenant-a', true));

    expect(postDeviceHeartbeat).toHaveBeenCalledTimes(1);
    expect(postDeviceHeartbeat).toHaveBeenCalledWith('tenant-a', 'token-1', 'DEV-001');

    act(() => {
      jest.advanceTimersByTime(DEVICE_HEARTBEAT_INTERVAL_MS);
    });

    expect(postDeviceHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('does not send heartbeat when disabled or device is missing', () => {
    getPairedDeviceCode.mockReturnValueOnce(undefined);
    renderHook(() => useDeviceHeartbeat('token-1', 'tenant-a', true));
    renderHook(() => useDeviceHeartbeat('token-1', 'tenant-a', false));
    renderHook(() => useDeviceHeartbeat(null, 'tenant-a', true));

    expect(postDeviceHeartbeat).not.toHaveBeenCalled();
  });

  it('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const { unmount } = renderHook(() => useDeviceHeartbeat('token-1', 'tenant-a', true));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    clearIntervalSpy.mockRestore();
  });
});
