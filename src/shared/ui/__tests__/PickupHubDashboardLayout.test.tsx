import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PickupHubDashboardLayout } from '../PickupHubDashboardLayout.js';

describe('PickupHubDashboardLayout', () => {
  it('ops kind (default): kpi → contentActions → toolbar → zones', () => {
    render(
      <PickupHubDashboardLayout
        kpi={<div>KPI</div>}
        contentActions={<div>Obnovit</div>}
        toolbar={<div>Filters</div>}
        zones={<div>Zones</div>}
      />,
    );

    const layout = screen.getByTestId('pickup-hub-dashboard-layout');
    expect(layout.getAttribute('data-kind')).toBe('ops');
    expect(layout.getAttribute('data-pickup-hub-dashboard-layout')).toBe('true');
    expect(screen.getByTestId('pickup-hub-dashboard-kpi')).toHaveTextContent('KPI');
    expect(screen.getByTestId('pickup-hub-dashboard-content-actions')).toHaveTextContent(
      'Obnovit',
    );
    expect(screen.getByTestId('pickup-hub-dashboard-toolbar')).toHaveTextContent('Filters');
    expect(screen.getByTestId('pickup-hub-dashboard-zones')).toHaveTextContent('Zones');

    const directChildrenTestIds = Array.from(layout.children).map((child) =>
      child.getAttribute('data-testid'),
    );
    expect(directChildrenTestIds).toEqual([
      'pickup-hub-dashboard-kpi',
      'pickup-hub-dashboard-content-actions',
      'pickup-hub-dashboard-toolbar',
      'pickup-hub-dashboard-zones',
    ]);
  });

  it('ops kind explicit: same slot order as default', () => {
    render(
      <PickupHubDashboardLayout
        kind="ops"
        kpi={<div>KPI</div>}
        contentActions={<div>Actions</div>}
        toolbar={<div>Toolbar</div>}
        zones={<div>Zones</div>}
      />,
    );

    expect(screen.getByTestId('pickup-hub-dashboard-layout').getAttribute('data-kind')).toBe(
      'ops',
    );
    expect(
      Array.from(screen.getByTestId('pickup-hub-dashboard-layout').children).map((child) =>
        child.getAttribute('data-testid'),
      ),
    ).toEqual([
      'pickup-hub-dashboard-kpi',
      'pickup-hub-dashboard-content-actions',
      'pickup-hub-dashboard-toolbar',
      'pickup-hub-dashboard-zones',
    ]);
  });

  it('analytics kind: toolbar → kpi → zones and skips contentActions', () => {
    render(
      <PickupHubDashboardLayout
        kind="analytics"
        kpi={<div>KPI</div>}
        contentActions={<div>ShouldNotRender</div>}
        toolbar={<div>Filters</div>}
        zones={<div>Zones</div>}
      />,
    );

    const layout = screen.getByTestId('pickup-hub-dashboard-layout');
    expect(layout.getAttribute('data-kind')).toBe('analytics');
    expect(screen.queryByTestId('pickup-hub-dashboard-content-actions')).not.toBeInTheDocument();
    expect(screen.queryByText('ShouldNotRender')).not.toBeInTheDocument();

    const directChildrenTestIds = Array.from(layout.children).map((child) =>
      child.getAttribute('data-testid'),
    );
    expect(directChildrenTestIds).toEqual([
      'pickup-hub-dashboard-toolbar',
      'pickup-hub-dashboard-kpi',
      'pickup-hub-dashboard-zones',
    ]);
  });

  it('analytics kind: empty contentActions stays omitted (toolbar → kpi → zones)', () => {
    render(
      <PickupHubDashboardLayout
        kind="analytics"
        kpi={<div>KPI</div>}
        toolbar={<div>Filters</div>}
        zones={<div>Zones</div>}
      />,
    );

    expect(screen.queryByTestId('pickup-hub-dashboard-content-actions')).not.toBeInTheDocument();
    expect(
      Array.from(screen.getByTestId('pickup-hub-dashboard-layout').children).map((child) =>
        child.getAttribute('data-testid'),
      ),
    ).toEqual([
      'pickup-hub-dashboard-toolbar',
      'pickup-hub-dashboard-kpi',
      'pickup-hub-dashboard-zones',
    ]);
  });

  it('omits empty optional slots', () => {
    render(<PickupHubDashboardLayout kind="ops" zones={<div>Only zones</div>} />);

    expect(screen.queryByTestId('pickup-hub-dashboard-kpi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-hub-dashboard-content-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-hub-dashboard-toolbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('pickup-hub-dashboard-zones')).toHaveTextContent('Only zones');
  });

  it('honors custom testId and className on the root', () => {
    render(
      <PickupHubDashboardLayout
        testId="staff-hub-layout"
        className="hub-extra"
        zones={<div>Z</div>}
      />,
    );

    const layout = screen.getByTestId('staff-hub-layout');
    expect(layout.className).toContain('hub-extra');
    expect(layout.className).toContain('flex-col');
  });
});
