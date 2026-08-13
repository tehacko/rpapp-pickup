import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PickupListLayout } from '../PickupListLayout.js';

describe('PickupListLayout', () => {
  it('renders children in the default vertical stack', () => {
    render(
      <PickupListLayout>
        <p>List body</p>
      </PickupListLayout>,
    );

    const layout = screen.getByTestId('pickup-list-layout');
    expect(layout.getAttribute('data-pickup-list-layout')).toBe('true');
    expect(layout.className).toMatch(/flex/);
    expect(layout.className).toMatch(/flex-col/);
    expect(layout.className).toMatch(/gap-\[var\(--pickup-stack-gap\)\]/);
    expect(screen.getByText('List body')).toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-kpi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-tools-before-kpi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-content-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-drawer')).not.toBeInTheDocument();
  });

  it('places contentActions slot after kpi', () => {
    render(
      <PickupListLayout
        kpiRow={<div>KPI strip</div>}
        contentActions={<div>Obnovit</div>}
      >
        <div>Main list</div>
      </PickupListLayout>,
    );

    const layout = screen.getByTestId('pickup-list-layout');
    const kpi = screen.getByTestId('pickup-list-layout-kpi');
    const contentActions = screen.getByTestId('pickup-list-layout-content-actions');

    expect(kpi).toHaveTextContent('KPI strip');
    expect(contentActions).toHaveTextContent('Obnovit');
    expect(
      kpi.compareDocumentPosition(contentActions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const directChildrenTestIds = Array.from(layout.children).map((child) =>
      child.getAttribute('data-testid'),
    );
    expect(directChildrenTestIds).toEqual([
      'pickup-list-layout-kpi',
      'pickup-list-layout-content-actions',
      null,
    ]);
  });

  it('renders optional banner, tools-before-kpi, kpi, contentActions, and drawer in order', () => {
    render(
      <PickupListLayout
        className="queue-screen"
        testId="queue-list-layout"
        banner={<div>Banner</div>}
        toolsBeforeKpi={<div>Compact tools</div>}
        kpiRow={<div>KPI strip</div>}
        contentActions={<div>Obnovit</div>}
        drawer={<aside>Drawer</aside>}
      >
        <div>Main table</div>
      </PickupListLayout>,
    );

    const layout = screen.getByTestId('queue-list-layout');
    expect(layout.className).toContain('queue-screen');
    expect(screen.getByTestId('pickup-list-layout-banner')).toHaveTextContent('Banner');
    expect(screen.getByTestId('pickup-list-layout-tools-before-kpi')).toHaveTextContent(
      'Compact tools',
    );
    expect(screen.getByTestId('pickup-list-layout-kpi')).toHaveTextContent('KPI strip');
    expect(screen.getByTestId('pickup-list-layout-content-actions')).toHaveTextContent(
      'Obnovit',
    );
    expect(screen.getByText('Main table')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-list-layout-drawer')).toHaveTextContent('Drawer');

    const directChildrenTestIds = Array.from(layout.children).map((child) =>
      child.getAttribute('data-testid'),
    );
    expect(directChildrenTestIds).toEqual([
      'pickup-list-layout-banner',
      'pickup-list-layout-tools-before-kpi',
      'pickup-list-layout-kpi',
      'pickup-list-layout-content-actions',
      null,
      'pickup-list-layout-drawer',
    ]);
  });

  it('omits null optional slots', () => {
    render(
      <PickupListLayout banner={null} kpiRow={null} contentActions={null}>
        <div>Only children</div>
      </PickupListLayout>,
    );

    expect(screen.queryByTestId('pickup-list-layout-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-kpi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-list-layout-content-actions')).not.toBeInTheDocument();
    expect(screen.getByText('Only children')).toBeInTheDocument();
  });
});
