import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Package } from 'lucide-react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PickupKpiCard, type PickupKpiTone } from '../PickupKpiCard.js';

function renderCard(
  props: ComponentProps<typeof PickupKpiCard>,
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <PickupKpiCard {...props} />
    </MemoryRouter>,
  );
}

describe('PickupKpiCard', () => {
  it('renders as a Link when href is set', () => {
    renderCard({ label: 'Ready', value: 4, href: '/queue' });

    const card = screen.getByTestId('pickup-kpi-card');
    expect(card.tagName).toBe('A');
    expect(card.getAttribute('href')).toBe('/queue');
    expect(card.getAttribute('aria-label')).toBe('Ready');
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders as a div when href is omitted', () => {
    renderCard({ label: 'Held', value: '2' });

    const card = screen.getByTestId('pickup-kpi-card');
    expect(card.tagName).toBe('DIV');
    expect(card.getAttribute('href')).toBeNull();
  });

  it('renders as a div when href is empty string', () => {
    renderCard({ label: 'Aging', value: 1, href: '' });

    const card = screen.getByTestId('pickup-kpi-card');
    expect(card.tagName).toBe('DIV');
  });

  it.each([
    ['neutral', 'text-[var(--color-on-surface)]', 'border-[var(--color-border)]'],
    ['success', 'text-[var(--color-success)]', 'var(--color-success)'],
    ['warn', 'text-[var(--color-warning)]', 'var(--color-warning)'],
    ['danger', 'text-[var(--color-danger)]', 'var(--color-danger)'],
  ] as const satisfies ReadonlyArray<readonly [PickupKpiTone, string, string]>)(
    'applies %s tone to value and surface',
    (tone, valueClassFragment, surfaceFragment) => {
      const { unmount } = renderCard({
        label: `${tone} label`,
        value: 9,
        tone,
        testId: `kpi-${tone}`,
      });

      const card = screen.getByTestId(`kpi-${tone}`);
      expect(card.className).toContain(surfaceFragment);

      const value = screen.getByText('9');
      expect(value.className).toContain(valueClassFragment);

      unmount();
    },
  );

  it('defaults tone to neutral', () => {
    renderCard({ label: 'Default', value: 0 });

    const value = screen.getByText('0');
    expect(value.className).toContain('text-[var(--color-on-surface)]');
    expect(screen.getByTestId('pickup-kpi-card').className).toContain(
      'border-[var(--color-border)]',
    );
  });

  it('renders hint when provided and omits empty hint', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PickupKpiCard label="Ready" value={3} hint="Waiting pickup" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Waiting pickup')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PickupKpiCard label="Ready" value={3} hint="" />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Waiting pickup')).not.toBeInTheDocument();
  });

  it('renders icon well when icon is provided', () => {
    renderCard({ label: 'Packages', value: 5, icon: Package, tone: 'success' });

    expect(screen.getByTestId('pickup-kpi-card').querySelector('svg')).not.toBeNull();
  });

  it('renders children inside the card', () => {
    renderCard({
      label: 'Custom',
      value: 1,
      children: <span data-testid="kpi-child">extra</span>,
    });

    expect(screen.getByTestId('kpi-child')).toHaveTextContent('extra');
  });

  it('adds interactive hover classes only when href is present', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PickupKpiCard label="Linked" value={1} href="/hub" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pickup-kpi-card').className).toContain('hover:-translate-y-px');

    rerender(
      <MemoryRouter>
        <PickupKpiCard label="Static" value={1} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pickup-kpi-card').className).not.toContain(
      'hover:-translate-y-px',
    );
  });
});
