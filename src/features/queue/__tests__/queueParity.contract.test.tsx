import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { QueueScreenActions } from '../useQueueScreen.js';
import { QueueScreenView } from '../QueueScreenView.js';

jest.mock('pi-kiosk-shared/ui', () => {
  const { Button } = jest.requireActual<{ Button: unknown }>(
    '../../../../../shared/src/ui/Button/Button.tsx',
  );
  return { Button };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function createActions(): QueueScreenActions {
  return {
    refresh: jest.fn(),
    setActivePickupPointId: jest.fn(),
  };
}

describe('pickup queue parity contract', () => {
  it('keeps retry CTA wired on load failure state', () => {
    const actions = createActions();
    render(
      <MemoryRouter>
        <QueueScreenView
          tenantCode="demo"
          actions={actions}
          screenState={{ kind: 'loadFailed' }}
          viewModel={null}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'pickup.common.retry' }));
    expect(actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps queue row open CTA visible on ready state', () => {
    const actions = createActions();
    render(
      <MemoryRouter>
        <QueueScreenView
          tenantCode="demo"
          actions={actions}
          screenState={{ kind: 'ready', items: [] }}
          viewModel={{
            tabs: [],
            activePickupPointId: 'all',
            items: [
              {
                fulfillmentId: 100,
                status: 'READY',
                pickupPointName: null,
                claimBadge: null,
              },
            ],
            isEmpty: false,
            errorMessage: null,
            showOfflineRetryBanner: false,
            showPickupPointTabs: false,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'pickup.queue.open' })).toBeTruthy();
  });
});
