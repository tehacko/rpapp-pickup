import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PickupWidgetCard } from '../PickupWidgetCard.js';

describe('PickupWidgetCard', () => {
  it('renders view-all chip Link when href and viewAllLabel are set', () => {
    render(
      <MemoryRouter>
        <PickupWidgetCard title="Queue" href="/queue" viewAllLabel="View all">
          <p>Widget body</p>
        </PickupWidgetCard>
      </MemoryRouter>,
    );

    const card = screen.getByTestId('pickup-widget-card');
    expect(card.tagName).toBe('ARTICLE');
    expect(screen.getByRole('heading', { name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByText('Widget body')).toBeInTheDocument();

    const chip = screen.getByRole('link', { name: 'View all' });
    expect(chip.getAttribute('href')).toBe('/queue');
    expect(chip.className).toContain('rounded-full');
  });

  it('omits view-all chip when href is missing', () => {
    render(
      <MemoryRouter>
        <PickupWidgetCard title="Queue" viewAllLabel="View all">
          <p>Body</p>
        </PickupWidgetCard>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });

  it('omits view-all chip when viewAllLabel is missing', () => {
    render(
      <MemoryRouter>
        <PickupWidgetCard title="Queue" href="/queue">
          <p>Body</p>
        </PickupWidgetCard>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders subtitle when provided and omits empty subtitle', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PickupWidgetCard title="Aging" subtitle="Needs attention">
          <p>Body</p>
        </PickupWidgetCard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Needs attention')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PickupWidgetCard title="Aging" subtitle="">
          <p>Body</p>
        </PickupWidgetCard>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
  });

  it('honors custom testId and className', () => {
    render(
      <MemoryRouter>
        <PickupWidgetCard title="Hub" testId="hub-widget" className="extra-pad">
          <span>ok</span>
        </PickupWidgetCard>
      </MemoryRouter>,
    );

    const card = screen.getByTestId('hub-widget');
    expect(card.className).toContain('extra-pad');
  });
});
