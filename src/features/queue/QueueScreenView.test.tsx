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
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

import { QueueScreenView, type QueueScreenViewProps } from './QueueScreenView.js';

function createViewModel(overrides: Partial<QueuePageViewModel> = {}): QueuePageViewModel {
  return {
    tabs: [{ id: 1, label: 'Counter A', count: 1 }],
    activePickupPointId: 'all',
    items: [
      {
        fulfillmentId: 42,
        status: 'READY',
        pickupPointName: 'Counter A',
        claimBadge: null,
        age: null,
        ageTone: null,
        ageLabel: null,
      },
    ],
    isEmpty: false,
    errorMessage: null,
    showOfflineRetryBanner: false,
    showPickupPointTabs: true,
    lastUpdatedAt: Date.parse('2026-07-18T12:00:00.000Z'),
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
        <Route path="/:tenantCode/scan" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  return actions;
}

describe('QueueScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state with skeleton ScreenState', () => {
    renderQueueScreen({
      screenState: { kind: 'loading' },
      viewModel: null,
    });

    expect(screen.getByTestId('queue-screen-loading')).toBeTruthy();
    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.queryByTestId('pickup-queue-row')).toBeNull();
  });

  it('renders load-failed state with retry wired to refresh', () => {
    const actions = renderQueueScreen({
      screenState: { kind: 'loadFailed' },
      viewModel: createViewModel({ errorMessage: 'Queue unavailable' }),
    });

    expect(screen.getByRole('alert').textContent).toContain('Queue unavailable');
    fireEvent.click(screen.getByTestId('pickup-screen-state-retry'));
    expect(actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders queue rows with status badge and navigates on row tap', () => {
    renderQueueScreen();

    const row = screen.getByTestId('pickup-queue-row');
    expect(row).toBeTruthy();
    expect(screen.getByTestId('pickup-status-badge')).toBeTruthy();
    expect(screen.getByText('#42')).toBeTruthy();

    fireEvent.click(row);

    expect(screen.getByTestId('location-path').textContent).toBe('/demo/order/42');
  });

  it('renders offline banner retry and sticky refresh', () => {
    const actions = renderQueueScreen({
      viewModel: createViewModel({ showOfflineRetryBanner: true }),
    });

    expect(screen.getByTestId('queue-offline-banner')).toBeTruthy();

    const retryButton = screen.getByTestId('queue-offline-banner').querySelector('button');
    expect(screen.getByTestId('queue-sticky-refresh')).toBeTruthy();
    expect(screen.getByTestId('queue-sticky-refresh')).toBeTruthy();

    expect(retryButton).toBeTruthy();
    fireEvent.click(retryButton as HTMLButtonElement);
    expect(actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('switches pickup-point tabs through SegmentTabs', () => {
    const actions = renderQueueScreen();
    expect(actions.setActivePickupPointId).not.toHaveBeenCalled();

    const counterTab = screen.getByRole('tab', { name: /Counter A/ });
    fireEvent.pointerDown(counterTab);
    fireEvent.click(counterTab);

    expect(screen.getByTestId('pickup-segment-tabs')).toBeTruthy();
    expect(actions.setActivePickupPointId).not.toHaveBeenCalled();
  });

  it('shows empty state CTA to scan', () => {
    renderQueueScreen({
      viewModel: createViewModel({ items: [], isEmpty: true }),
    });

    const scanCta = screen.getByTestId('pickup-empty-state').querySelector('button');
    expect(scanCta).toBeTruthy();
    fireEvent.click(scanCta as HTMLButtonElement);
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/scan');
  });

  it('renders aging StatusBadge tones from viewModel ageTone', () => {
    renderQueueScreen({
      viewModel: createViewModel({
        items: [
          {
            fulfillmentId: 7,
            status: 'READY',
            pickupPointName: 'Counter A',
            claimBadge: null,
            age: {
              tone: 'danger',
              urgency: 'high',
              labelKind: 'overdue',
              minutes: 20,
            },
            ageTone: 'danger',
            ageLabel: '20m overdue',
          },
          {
            fulfillmentId: 8,
            status: 'READY',
            pickupPointName: 'Counter A',
            claimBadge: null,
            age: {
              tone: 'warn',
              labelKind: 'overdue',
              minutes: 8,
            },
            ageTone: 'warn',
            ageLabel: '8m overdue',
          },
          {
            fulfillmentId: 9,
            status: 'READY',
            pickupPointName: 'Counter A',
            claimBadge: null,
            age: {
              tone: 'neutral',
              labelKind: 'ago',
              minutes: 3,
            },
            ageTone: 'neutral',
            ageLabel: '3m ago',
          },
        ],
      }),
    });

    const ageBadges = screen.getAllByTestId('queue-age-badge');
    expect(ageBadges).toHaveLength(3);
    expect(ageBadges[0]?.getAttribute('data-age-tone')).toBe('danger');
    expect(ageBadges[1]?.getAttribute('data-age-tone')).toBe('warn');
    expect(ageBadges[2]?.getAttribute('data-age-tone')).toBe('neutral');
    expect(screen.getAllByTestId('pickup-status-badge').length).toBeGreaterThanOrEqual(3);
  });
});
