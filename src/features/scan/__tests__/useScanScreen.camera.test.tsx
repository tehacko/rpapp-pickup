/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useScanScreen } from '../useScanScreen.js';
import type { IScanGateway } from '../IScanGateway.js';

jest.mock('../scanGateway.js', () => ({
  scanGateway: {
    resolve: jest.fn(),
    resolveByCode: jest.fn(),
  },
}));

jest.mock('../../../i18n.js', () => ({
  __esModule: true,
  default: {
    resolvedLanguage: 'en',
    language: 'en',
    t: (key: string) => key,
  },
}));

const useQrScannerMock = jest.fn(() => ({
  status: 'idle' as const,
  engine: null as null,
  zxingAssistActive: false,
  degradedMode: false,
  errorMessage: null as string | null,
}));

jest.mock('../../../hooks/useQrScanner.js', () => ({
  useQrScanner: (opts: unknown) => useQrScannerMock(opts),
}));

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    activePickupPointId: null,
    isRoamingStaff: false,
  }),
}));

jest.mock('../../../shared/hooks/usePickupErrorHandler.js', () => ({
  usePickupErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function createGatewayMock(): jest.Mocked<IScanGateway> {
  return {
    resolve: jest.fn(),
    resolveByCode: jest.fn(),
  };
}

type QrScannerOpts = {
  enabled: boolean;
  onBackgroundStop?: () => void;
  sessionKey?: number;
};

function latestQrScannerOpts(): QrScannerOpts {
  const call = useQrScannerMock.mock.calls.at(-1)?.[0];
  if (call === undefined || typeof call !== 'object') {
    throw new Error('useQrScanner was not called');
  }
  return call as QrScannerOpts;
}

describe('useScanScreen camera hook wiring (G7 / G19)', () => {
  beforeEach(() => {
    useQrScannerMock.mockReset();
    useQrScannerMock.mockReturnValue({
      status: 'idle',
      engine: null,
      zxingAssistActive: false,
      degradedMode: false,
      errorMessage: null,
    });
  });

  it('passes initial sessionKey 0 to useQrScanner', () => {
    renderHook(() => useScanScreen(createGatewayMock()));

    expect(latestQrScannerOpts().sessionKey).toBe(0);
  });

  it('bumps sessionKey on startCamera and retryCamera', () => {
    const { result } = renderHook(() => useScanScreen(createGatewayMock()));

    act(() => {
      result.current.actions.startCamera();
    });
    expect(latestQrScannerOpts().sessionKey).toBe(1);

    act(() => {
      result.current.actions.retryCamera();
    });
    expect(latestQrScannerOpts().sessionKey).toBe(2);
  });

  it('wires onBackgroundStop to disable camera (G7)', async () => {
    renderHook(() => useScanScreen(createGatewayMock()));

    expect(latestQrScannerOpts().enabled).toBe(true);
    expect(typeof latestQrScannerOpts().onBackgroundStop).toBe('function');

    act(() => {
      latestQrScannerOpts().onBackgroundStop?.();
    });

    await waitFor(() => {
      expect(latestQrScannerOpts().enabled).toBe(false);
    });
  });

  it('sets runningDegraded message when degradedMode is true', () => {
    useQrScannerMock.mockReturnValue({
      status: 'running',
      engine: 'zxing',
      zxingAssistActive: true,
      degradedMode: true,
      errorMessage: null,
    });

    const { result } = renderHook(() => useScanScreen(createGatewayMock()));

    expect(result.current.viewModel.cameraRunningMessage).toBe('pickup.scan.runningDegraded');
  });
});
