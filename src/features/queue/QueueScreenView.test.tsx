import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { QueuePageViewModel } from './buildQueuePageViewModel.js';
import type { QueueScreenActions } from './useQueueScreen.js';

jest.mock('pi-kiosk-shared/ui', () => {
  const { Button } = jest.requireActual<{ Button: unknown }>(
    '../../../../shared/src/ui/Button/Button.tsx',
  );
  return { Button };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { QueueScreenView, type QueueScreenViewProps } from './QueueScreenView.js';

function expectPickupSurfaceButton(element: HTMLElement): void {
  expect(element.className).toContain('rounded-[var(--radius-lg)]');
  expect(element.className).toContain('h-11');
}

function _expectPickupPrimaryButton(element: HTMLElement): void {
  expectPickupSurfaceButton(element);
  expect(element.className).toContain('bg-[var(--color-accent)]');
}

function expectPickupSecondaryButton(element: HTMLElement): void {
  expectPickupSurfaceButton(element);
  expect(element.className).toContain('bg-[var(--color-surface)]');
}

function createViewModel(overrides: Partial<QueuePageViewModel> = {}): QueuePageViewModel {
  return {
    tabs: [{ id: 1, label: 'Counter A' }],
    activePickupPointId: 'all',
    items: [
      {
        fulfillmentId: 42,
        status: 'READY',
        pickupPointName: 'Counter A',
        claimBadge: null,
      },
    ],
    isEmpty: false,
    errorMessage: null,
    showOfflineRetryBanner: false,
    showPickupPointTabs: true,
    ...overrides,
  };
}

function createActions(): QueueScreenActions {
  return {
    setActivePickupPointId: jest.fn(),
    refresh: jest.fn(),
  };
}

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function renderQueueScreen(overrides: Partial<QueueScreenViewProps> = {}): QueueScreenActions {
  const actions = overrides.actions ?? createActions();
  const props: QueueScreenViewProps = {
    screenState: { kind: 'ready', items: [] },
    viewModel: createViewModel(),
    tenantCode: 'demo',
    ...overrides,
    actions,
  };

  render(
    <MemoryRouter initialEntries={['/demo/queue']}>
      <Routes>
        <Route
          path="/:tenantCode/queue"
          element={
            <>
              <QueueScreenView {...props} />
              <LocationProbe />
            </>
          }
        />
        <Route path="/:tenantCode/order/:fulfillmentId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  return actions;
}

describe('QueueScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state without queue action buttons', () => {
    renderQueueScreen({
      screenState: { kind: 'loading' },
      viewModel: null,
    });

    expect(screen.getByRole('heading', { name: 'pickup.queue.title' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('pickup.queue.loading');
    expect(screen.queryByRole('button', { name: 'pickup.queue.open' })).toBeNull();
  });

  it('renders load-failed state with retry wired to refresh', () => {
    const actions = renderQueueScreen({
      screenState: { kind: 'loadFailed' },
      viewModel: createViewModel({ errorMessage: 'Queue unavailable' }),
    });

    expect(screen.getByRole('alert').textContent).toContain('Queue unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'pickup.common.retry' }));
    expect(actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders queue items with shared pickup open buttons', () => {
    renderQueueScreen();

    const openButton = screen.getByRole('button', { name: 'pickup.queue.open' });
    expectPickupSecondaryButton(openButton);
    expect(screen.getByText(/#42 — READY/)).toBeTruthy();
  });

  it('navigates to order detail when open button is clicked', () => {
    renderQueueScreen();

    fireEvent.click(screen.getByRole('button', { name: 'pickup.queue.open' }));

    expect(screen.getByTestId('location-path').textContent).toBe('/demo/order/42');
  });

  it('renders offline banner retry as shared pickup button', () => {
    const actions = renderQueueScreen({
      viewModel: createViewModel({ showOfflineRetryBanner: true }),
    });

    expect(screen.getByTestId('queue-offline-banner')).toBeTruthy();

    const retryButton = screen.getByRole('button', { name: 'pickup.queue.retry' });
    expectPickupSecondaryButton(retryButton);

    fireEvent.click(retryButton);
    expect(actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('switches pickup-point tabs through native tab buttons', () => {
    const actions = renderQueueScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Counter A' }));

    expect(actions.setActivePickupPointId).toHaveBeenCalledWith(1);
  });
});
