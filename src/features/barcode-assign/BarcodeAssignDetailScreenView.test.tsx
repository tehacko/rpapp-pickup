import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import type { BarcodeAssignDetailViewModel } from './buildBarcodeAssignDetailViewModel.js';
import type { BarcodeAssignDetailScreenActions } from './useBarcodeAssignDetailScreen.js';

jest.mock('pi-kiosk-shared/ui', () => {
  const { Button } = jest.requireActual<{ Button: unknown }>(
    '../../../../shared/src/ui/Button/Button.tsx',
  );
  const { Card } = jest.requireActual<{ Card: unknown }>(
    '../../../../shared/src/ui/Card/Card.tsx',
  );
  return { Button, Card };
});

jest.mock('pi-kiosk-shared/barcode-scanner', () => ({
  decodeBarcodeFromVideoFrame: jest.fn(async () => ({ payload: '8593807360153', engine: 'zbar-wasm' })),
  resolveScannerPlatformProfile: jest.fn(() => ({ preferPreviewSnap: true })),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { productId?: number; name?: string; value?: string }) => {
      if (key === 'pickup.barcodeAssign.detailTitle' && opts?.productId !== undefined) {
        return `${key}:${opts.productId}`;
      }
      if (key === 'pickup.barcodeAssign.variantSelected' && opts?.name !== undefined) {
        return `${key}:${opts.name}`;
      }
      if (key === 'pickup.barcodeAssign.current' && opts?.value !== undefined) {
        return `${key}:${opts.value}`;
      }
      return key;
    },
  }),
}));

import { BarcodeAssignDetailScreenView } from './BarcodeAssignDetailScreenView.js';

function createViewModel(
  overrides: Partial<BarcodeAssignDetailViewModel> = {},
): BarcodeAssignDetailViewModel {
  return {
    tenantCode: 'demo',
    productId: 42,
    variantId: 7,
    selectedVariantLabel: 'Large',
    needsVariantPicker: false,
    catalogLoading: false,
    catalogError: null,
    variantRows: [],
    draftCode: '',
    cameraEnabled: false,
    cameraStatus: 'off',
    cameraError: null,
    cameraRunningMessage: null,
    isChecking: false,
    checkResult: null,
    checkError: null,
    conflictBlocked: false,
    conflictIncomplete: false,
    conflictProductName: undefined,
    conflictProductId: undefined,
    conflictVariantId: undefined,
    canOpenConflictProduct: false,
    confirmOverwrite: false,
    canSave: false,
    canMove: false,
    isSaving: false,
    saveError: null,
    currentBarcode: null,
    confirmClear: false,
    artifactLinearUrl: '/linear.png',
    artifactQrUrl: '/qr.png',
    ...overrides,
  };
}

function createActions(): BarcodeAssignDetailScreenActions {
  return {
    setDraftCode: jest.fn(),
    startCamera: jest.fn(),
    retryCamera: jest.fn(),
    applyCameraDecode: jest.fn(),
    save: jest.fn((event: FormEvent) => event.preventDefault()),
    armOrConfirmMove: jest.fn(),
    cancelMove: jest.fn(),
    openConflictProduct: jest.fn(),
    retryConflictCheck: jest.fn(),
    requestClear: jest.fn(),
    cancelClear: jest.fn(),
    confirmClear: jest.fn(),
    openVariant: jest.fn(),
    retryCatalog: jest.fn(),
  };
}

describe('BarcodeAssignDetailScreenView camera (G13/G16)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('G16: hides preview on deny and shows recovery strip', () => {
    const actions = createActions();
    render(
      <BarcodeAssignDetailScreenView
        viewModel={createViewModel({
          cameraEnabled: true,
          cameraStatus: 'denied',
          cameraError: 'pickup.barcodeAssign.cameraDenied',
        })}
        actions={actions}
        videoRef={{ current: null }}
      />,
    );

    expect(screen.getByTestId('barcode-assign-camera-recovery')).toBeTruthy();
    expect(screen.queryByTestId('barcode-assign-camera-preview')).toBeNull();
    expect(screen.queryByTestId('barcode-assign-camera-snap-preview')).toBeNull();
    expect(screen.queryByTestId('barcode-assign-camera-snap-file')).toBeNull();
    expect(document.querySelector('[data-testid$="-snap-file"]')).toBeNull();

    fireEvent.click(screen.getByTestId('barcode-assign-camera-recovery-retry'));
    expect(actions.retryCamera).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('barcode-assign-camera-recovery-manual'));
    expect(document.activeElement?.id).toBe('pickup-barcode-code');
  });

  it('G16: error status with enabled true omits preview; retry CTA is primary', () => {
    const actions = createActions();
    render(
      <BarcodeAssignDetailScreenView
        viewModel={createViewModel({
          cameraEnabled: true,
          cameraStatus: 'error',
          cameraError: 'pickup.barcodeAssign.cameraError',
        })}
        actions={actions}
        videoRef={{ current: null }}
      />,
    );

    expect(screen.getByTestId('barcode-assign-camera-recovery')).toBeTruthy();
    expect(screen.getByTestId('barcode-assign-camera-recovery-retry')).toBeTruthy();
    expect(screen.queryByTestId('barcode-assign-camera-preview')).toBeNull();
    expect(screen.queryByTestId('barcode-assign-camera-snap-preview')).toBeNull();
    expect(screen.queryByTestId('barcode-assign-camera-snap-file')).toBeNull();
    expect(document.querySelector('[data-testid$="-snap-file"]')).toBeNull();

    fireEvent.click(screen.getByTestId('barcode-assign-camera-recovery-retry'));
    expect(actions.retryCamera).toHaveBeenCalledTimes(1);
  });

  it('uses barcodeAssign i18n prefix for start camera when camera is off', () => {
    render(
      <BarcodeAssignDetailScreenView
        viewModel={createViewModel({ cameraEnabled: false, cameraStatus: 'off' })}
        actions={createActions()}
        videoRef={{ current: null }}
      />,
    );

    expect(screen.getByRole('button', { name: 'pickup.barcodeAssign.startCamera' })).toBeTruthy();
  });

  it('shows snap CTA when camera running', () => {
    render(
      <BarcodeAssignDetailScreenView
        viewModel={createViewModel({
          cameraEnabled: true,
          cameraStatus: 'running',
          cameraRunningMessage: 'pickup.barcodeAssign.runningDegraded',
        })}
        actions={createActions()}
        videoRef={{ current: document.createElement('video') }}
      />,
    );

    expect(screen.getByText('pickup.barcodeAssign.runningDegraded')).toBeTruthy();
    expect(screen.getByTestId('barcode-assign-camera-preview')).toBeTruthy();
    expect(screen.getByTestId('barcode-assign-camera-snap-preview')).toBeTruthy();
    expect(screen.queryByTestId('barcode-assign-camera-snap-file')).toBeNull();
    expect(document.querySelector('[data-testid$="-snap-file"]')).toBeNull();
  });

  it('wires preview snap to applyCameraDecode', async () => {
    const actions = createActions();
    render(
      <BarcodeAssignDetailScreenView
        viewModel={createViewModel({
          cameraEnabled: true,
          cameraStatus: 'running',
        })}
        actions={actions}
        videoRef={{ current: document.createElement('video') }}
      />,
    );

    fireEvent.click(screen.getByTestId('barcode-assign-camera-snap-preview'));
    await Promise.resolve();
    await Promise.resolve();

    expect(actions.applyCameraDecode).toHaveBeenCalledWith('8593807360153');
  });
});
