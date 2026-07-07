import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { ScanPageViewModel } from './buildScanPageViewModel.js';
import type { ScanScreenActions } from './useScanScreen.js';

jest.mock('pi-kiosk-shared/ui', () => {
  const { Button } = jest.requireActual<{ Button: unknown }>(
    '../../../../shared/src/ui/Button/Button.tsx',
  );
  const { Card } = jest.requireActual<{ Card: unknown }>(
    '../../../../shared/src/ui/Card/Card.tsx',
  );
  return { Button, Card };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ScanScreenView, type ScanScreenViewProps } from './ScanScreenView.js';

function expectPickupSurfaceButton(element: HTMLElement): void {
  expect(element.className).toContain('rounded-[var(--radius-lg)]');
  expect(element.className).toContain('h-11');
}

function expectPickupPrimaryButton(element: HTMLElement): void {
  expectPickupSurfaceButton(element);
  expect(element.className).toContain('bg-[var(--color-accent)]');
}

function expectPickupSecondaryButton(element: HTMLElement): void {
  expectPickupSurfaceButton(element);
  expect(element.className).toContain('bg-[var(--color-surface)]');
}

function createViewModel(overrides: Partial<ScanPageViewModel> = {}): ScanPageViewModel {
  return {
    scanToken: '',
    shortCode: '',
    cameraEnabled: false,
    cameraStatus: 'off',
    cameraError: null,
    errorMessage: null,
    isResolving: false,
    resolved: null,
    wrongPickupPointMessage: null,
    canOpenOrder: false,
    ...overrides,
  };
}

function createActions(): ScanScreenActions {
  return {
    setScanToken: jest.fn(),
    setShortCode: jest.fn(),
    startCamera: jest.fn(),
    resolveToken: jest.fn((event: FormEvent) => event.preventDefault()),
    resolveShortCode: jest.fn((event: FormEvent) => event.preventDefault()),
    openOrder: jest.fn(),
  };
}

function renderScanScreen(overrides: Partial<ScanScreenViewProps> = {}): ScanScreenActions {
  const actions = overrides.actions ?? createActions();
  const props: ScanScreenViewProps = {
    screenState: { kind: 'ready' },
    viewModel: createViewModel(),
    tenantCode: 'demo',
    videoRef: { current: null },
    ...overrides,
    actions,
  };

  render(
    <MemoryRouter>
      <ScanScreenView {...props} />
    </MemoryRouter>,
  );

  return actions;
}

describe('ScanScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders scan shell with shared pickup Button CTAs', () => {
    renderScanScreen();

    expect(screen.getByRole('heading', { name: 'pickup.scan.title' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'pickup.scan.startCamera' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'pickup.scan.resolve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'pickup.scan.resolveCode' })).toBeTruthy();
  });

  it('applies pickup surface styles to primary and secondary buttons', () => {
    renderScanScreen();

    expectPickupSecondaryButton(screen.getByRole('button', { name: 'pickup.scan.startCamera' }));
    expectPickupPrimaryButton(screen.getByRole('button', { name: 'pickup.scan.resolve' }));
    expectPickupPrimaryButton(screen.getByRole('button', { name: 'pickup.scan.resolveCode' }));
  });

  it('calls startCamera when the secondary camera button is clicked', () => {
    const actions = renderScanScreen();

    fireEvent.click(screen.getByRole('button', { name: 'pickup.scan.startCamera' }));

    expect(actions.startCamera).toHaveBeenCalledTimes(1);
  });

  it('submits token and short-code forms through shared pickup buttons', () => {
    const actions = renderScanScreen({
      viewModel: createViewModel({ scanToken: 'scan-abc', shortCode: 'AB12' }),
    });

    const resolveButton = screen.getByRole('button', { name: 'pickup.scan.resolve' });
    const resolveCodeButton = screen.getByRole('button', { name: 'pickup.scan.resolveCode' });
    const tokenForm = resolveButton.closest('form');
    const shortCodeForm = resolveCodeButton.closest('form');
    if (!(tokenForm instanceof HTMLFormElement) || !(shortCodeForm instanceof HTMLFormElement)) {
      throw new Error('Expected resolve buttons to be inside forms');
    }
    fireEvent.submit(tokenForm);
    fireEvent.submit(shortCodeForm);

    expect(actions.resolveToken).toHaveBeenCalledTimes(1);
    expect(actions.resolveShortCode).toHaveBeenCalledTimes(1);
  });

  it('renders resolved preview with pickup open-order button wired to actions', () => {
    const actions = renderScanScreen({
      viewModel: createViewModel({
        resolved: {
          fulfillmentId: 99,
          fulfillmentStatus: 'READY',
          paymentCompleted: true,
        },
        canOpenOrder: true,
      }),
    });

    const openOrderButton = screen.getByRole('button', { name: 'pickup.scan.openOrder' });
    expectPickupPrimaryButton(openOrderButton);

    fireEvent.click(openOrderButton);
    expect(actions.openOrder).toHaveBeenCalledTimes(1);
  });

  it('disables resolve buttons while resolving and open-order when blocked', () => {
    renderScanScreen({
      viewModel: createViewModel({
        isResolving: true,
        resolved: {
          fulfillmentId: 12,
          fulfillmentStatus: 'READY',
          paymentCompleted: false,
        },
        canOpenOrder: false,
      }),
    });

    expect((screen.getByRole('button', { name: 'pickup.scan.resolve' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole('button', { name: 'pickup.scan.resolveCode' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole('button', { name: 'pickup.scan.openOrder' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
