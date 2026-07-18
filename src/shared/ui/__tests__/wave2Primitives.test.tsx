import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Package } from 'lucide-react';
import { cn } from '../cn.js';
import { Badge } from '../Badge.js';
import { mapStatusToTone, StatusBadge } from '../StatusBadge.js';
import { ClaimBadge } from '../ClaimBadge.js';
import { PageHeader } from '../PageHeader.js';
import { PageSectionHeader } from '../PageSectionHeader.js';
import { SectionCard } from '../SectionCard.js';
import { MetaRow } from '../MetaRow.js';
import { ListRow } from '../ListRow.js';
import { QueueRow } from '../QueueRow.js';
import { OrderLineRow } from '../OrderLineRow.js';
import { EmptyState } from '../EmptyState.js';
import { Skeleton, SkeletonRow, SkeletonText } from '../Skeleton.js';
import { OfflineBanner, AlertBanner, InlineNotice } from '../AlertBanner.js';
import { PickupListLayout } from '../PickupListLayout.js';
import { ActionTile } from '../ActionTile.js';
import { KpiStat } from '../KpiStat.js';
import { IconButton } from '../IconButton.js';
import { SearchField } from '../SearchField.js';
import { Input } from '../Input.js';
import { SegmentTabs } from '../SegmentTabs.js';
import { PickupStickyCta } from '../PickupStickyCta.js';
import { QuantityStepper } from '../QuantityStepper.js';
import { FilterChip } from '../FilterChip.js';
import { ScreenState } from '../ScreenState.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

describe('pickup wave2 primitives', () => {
  it('cn merges conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('maps status keys to Sailor tones only', () => {
    expect(mapStatusToTone('ready')).toBe('success');
    expect(mapStatusToTone('held')).toBe('warn');
    expect(mapStatusToTone('refused')).toBe('danger');
    expect(mapStatusToTone('aging')).toBe('warn');
    expect(mapStatusToTone('offline')).toBe('neutral');
    expect(mapStatusToTone('claim')).toBe('neutral');
  });

  it('renders Badge / StatusBadge / ClaimBadge', () => {
    const { rerender } = render(<Badge tone="success">OK</Badge>);
    expect(screen.getByText('OK')).toBeTruthy();

    rerender(<StatusBadge label="Ready" status="ready" urgency="high" />);
    expect(screen.getByTestId('pickup-status-badge').getAttribute('data-urgency')).toBe('high');

    rerender(
      <ClaimBadge
        claim={{
          deviceLabel: 'SP-1',
          isClaimedByCurrentDevice: true,
        }}
      />,
    );
    const thisDevice = screen.getByTestId('pickup-claim-badge');
    expect(thisDevice.getAttribute('data-claim')).toBe('this-device');
    expect(thisDevice.getAttribute('data-tone')).toBe('success');

    rerender(
      <ClaimBadge
        claim={{
          deviceLabel: 'SP-1',
          isClaimedByCurrentDevice: false,
          expiresSoon: true,
        }}
      />,
    );
    const expiresSoon = screen.getByTestId('pickup-claim-badge');
    expect(expiresSoon.getAttribute('data-claim')).toBe('expires-soon');
    expect(expiresSoon.getAttribute('data-tone')).toBe('warn');

    rerender(
      <ClaimBadge
        claim={{
          deviceLabel: 'SP-2',
          isClaimedByCurrentDevice: false,
        }}
      />,
    );
    const otherDevice = screen.getByTestId('pickup-claim-badge');
    expect(otherDevice.getAttribute('data-claim')).toBe('other-device');
    expect(otherDevice.getAttribute('data-tone')).toBe('neutral');
  });

  it('renders page chrome and section card', () => {
    render(
      <>
        <PageHeader title="Queue" lead="Live" titleIcon={Package} actions={<span>Act</span>} />
        <PageSectionHeader title="Section" layout="toolbar" actions={<span>More</span>} />
        <SectionCard title="Device" elevated>
          <MetaRow label="Paired" value="Tablet A" />
        </SectionCard>
      </>,
    );
    expect(screen.getByTestId('pickup-page-header')).toBeTruthy();
    expect(screen.getByTestId('pickup-section-card')).toBeTruthy();
    expect(screen.getByTestId('pickup-meta-row')).toBeTruthy();
  });

  it('supports list / queue / order rows', () => {
    const onSelect = jest.fn();
    const onToggle = jest.fn();
    render(
      <>
        <ListRow onSelect={onSelect}>
          Item
        </ListRow>
        <QueueRow
          fulfillmentId="F-1"
          status="held"
          statusLabel="Held"
          title="Order 1"
          onSelect={onSelect}
        />
        <OrderLineRow label="Latte" qty={2} selected onToggle={onToggle} />
      </>,
    );
    fireEvent.click(screen.getByTestId('pickup-list-row'));
    expect(onSelect).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('pickup-queue-row'));
    expect(onSelect).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByLabelText('Latte'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders empty / skeleton / banners / layout', () => {
    render(
      <PickupListLayout
        banner={<OfflineBanner message="Offline" />}
        kpiRow={<KpiStat label="Ready" value={3} />}
      >
        <EmptyState title="Empty" message="None" hint="Try scan" />
        <Skeleton className="h-4 w-24" />
        <SkeletonText lines={2} />
        <SkeletonRow count={2} />
        <AlertBanner message="Warn" tone="warn" />
        <InlineNotice tone="neutral">Note</InlineNotice>
      </PickupListLayout>,
    );
    expect(screen.getByTestId('pickup-offline-banner')).toBeTruthy();
    expect(screen.getByTestId('pickup-alert-banner')).toBeTruthy();
    expect(screen.getByTestId('pickup-inline-notice')).toBeTruthy();
    expect(screen.getByTestId('pickup-list-layout-kpi')).toBeTruthy();
    expect(screen.getByTestId('pickup-kpi-stat')).toBeTruthy();
    expect(screen.getByTestId('pickup-empty-state')).toBeTruthy();
    expect(screen.getAllByTestId('pickup-skeleton').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('pickup-skeleton-row').length).toBeGreaterThan(0);
  });

  it('renders action tile, icon button, search, input, tabs, sticky slots, stepper, chips', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const onTab = jest.fn();
    const onInc = jest.fn();
    const onDec = jest.fn();
    const onChip = jest.fn();
    render(
      <MemoryRouter>
        <ActionTile to="/hub" icon={Package} label="Hub" />
        <IconButton icon={Package} aria-label="Open package" />
        <SearchField value="ab" onChange={onChange} onClear={onClear} placeholder="Search" />
        <Input aria-label="Name" data-testid="pickup-input" />
        <SegmentTabs
          tabs={[
            { id: 'a', label: 'A', count: 1 },
            { id: 'b', label: 'B' },
          ]}
          activeId="a"
          onChange={onTab}
          ariaLabel="Points"
        />
        <FilterChip label="Milk" selected onClick={onChip} />
        <QuantityStepper value={2} onInc={onInc} onDec={onDec} aria-label="Qty" />
        <PickupStickyCta
          primary={<button type="button">Confirm</button>}
          secondary={<button type="button">Hold</button>}
          danger={<button type="button">Refuse</button>}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pickup-action-tile')).toBeTruthy();
    expect(screen.getByLabelText('Open package')).toBeTruthy();
    expect(screen.getByTestId('pickup-input')).toBeTruthy();
    fireEvent.click(screen.getByTestId('pickup-search-field-clear'));
    expect(onClear).toHaveBeenCalled();
    expect(screen.getByTestId('pickup-sticky-cta-primary')).toBeTruthy();
    fireEvent.click(screen.getByTestId('pickup-quantity-stepper-inc'));
    expect(onInc).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('pickup-quantity-stepper-dec'));
    expect(onDec).toHaveBeenCalled();
    expect(screen.getByTestId('pickup-filter-chip').getAttribute('data-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('pickup-filter-chip'));
    expect(onChip).toHaveBeenCalled();
  });

  it('ScreenState loading uses skeleton; error shows retry when provided', () => {
    const onRetry = jest.fn();
    const { rerender } = render(<ScreenState variant="loading" />);
    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getAllByTestId('pickup-skeleton-row').length).toBeGreaterThan(0);

    rerender(<ScreenState variant="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('pickup-screen-state-retry'));
    expect(onRetry).toHaveBeenCalled();

    rerender(<ScreenState variant="empty" title="None" message="Empty queue" />);
    expect(screen.getByTestId('pickup-empty-state')).toBeTruthy();
  });
});

describe('pickup wave2 primitives RTL', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('PageHeader / MetaRow / QueueRow / SegmentTabs / IconButton / SearchField mount under dir=rtl', () => {
    const onSelect = jest.fn();
    const onTab = jest.fn();
    const onChange = jest.fn();
    const onClear = jest.fn();

    render(
      <MemoryRouter>
        <PageHeader title="Queue" lead="Live" titleIcon={Package} actions={<span>Act</span>} />
        <MetaRow label="Paired" value="Tablet A" />
        <QueueRow
          fulfillmentId="F-rtl"
          status="ready"
          statusLabel="Ready"
          title="Order RTL"
          onSelect={onSelect}
        />
        <SegmentTabs
          tabs={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ]}
          activeId="a"
          onChange={onTab}
          ariaLabel="Points"
        />
        <IconButton icon={Package} aria-label="Open package" />
        <SearchField value="" onChange={onChange} onClear={onClear} placeholder="Search" />
        <Badge tone="neutral">Claim</Badge>
        <EmptyState title="Empty" message="None" />
        <PickupStickyCta primary={<button type="button">Confirm</button>} />
      </MemoryRouter>,
    );

    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(screen.getByTestId('pickup-page-header')).toBeTruthy();
    expect(screen.getByTestId('pickup-meta-row')).toBeTruthy();
    expect(screen.getByTestId('pickup-queue-row')).toBeTruthy();
    expect(screen.getByTestId('pickup-segment-tabs')).toBeTruthy();
    expect(screen.getByLabelText('Open package')).toBeTruthy();
    expect(screen.getByTestId('pickup-search-field')).toBeTruthy();
    expect(screen.getByTestId('pickup-empty-state')).toBeTruthy();
    expect(screen.getByTestId('pickup-sticky-cta-primary')).toBeTruthy();
  });

  it('PageSectionHeader toolbar + OrderLineRow + ActionTile mount under dir=rtl', () => {
    render(
      <MemoryRouter>
        <PageSectionHeader title="Section" layout="toolbar" actions={<span>More</span>} />
        <OrderLineRow label="Latte" qty={1} />
        <ActionTile to="/hub" icon={Package} label="Hub" />
        <StatusBadge label="Held" status="held" />
        <ClaimBadge
          claim={{
            deviceLabel: 'SP-2',
            isClaimedByCurrentDevice: false,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pickup-page-section-header')).toBeTruthy();
    expect(screen.getByTestId('pickup-order-line-row')).toBeTruthy();
    expect(screen.getByTestId('pickup-action-tile')).toBeTruthy();
    expect(screen.getByTestId('pickup-status-badge')).toBeTruthy();
    const claimBadge = screen.getByTestId('pickup-claim-badge');
    expect(claimBadge).toBeTruthy();
    expect(claimBadge.getAttribute('data-tone')).toBe('neutral');
  });

  it('FilterChip / QuantityStepper / ScreenState / banners / Skeleton* / ListRow / Input / KpiStat / ClaimBadge under dir=rtl', () => {
    const onChip = jest.fn();
    const onInc = jest.fn();
    const onDec = jest.fn();
    const onSelect = jest.fn();
    const onRetry = jest.fn();

    const { rerender } = render(
      <MemoryRouter>
        <FilterChip label="Milk" selected onClick={onChip} />
        <QuantityStepper value={3} onInc={onInc} onDec={onDec} aria-label="Qty" />
        <ScreenState variant="loading" />
        <OfflineBanner message="Offline RTL" />
        <AlertBanner message="Alert RTL" tone="warn" />
        <InlineNotice tone="success">Notice</InlineNotice>
        <Skeleton className="h-3 w-16" />
        <SkeletonText lines={2} />
        <SkeletonRow count={1} />
        <ListRow onSelect={onSelect}>RTL row</ListRow>
        <Input aria-label="RTL input" data-testid="pickup-input-rtl" />
        <KpiStat label="Ready" value={7} />
        <ClaimBadge claim={{ deviceLabel: 'A', isClaimedByCurrentDevice: true }} />
      </MemoryRouter>,
    );

    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(screen.getByTestId('pickup-filter-chip')).toBeTruthy();
    expect(screen.getByTestId('pickup-quantity-stepper')).toBeTruthy();
    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('pickup-offline-banner')).toBeTruthy();
    expect(screen.getByTestId('pickup-alert-banner')).toBeTruthy();
    expect(screen.getByTestId('pickup-inline-notice').getAttribute('data-tone')).toBe('success');
    expect(screen.getAllByTestId('pickup-skeleton').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('pickup-skeleton-row').length).toBeGreaterThan(0);
    expect(screen.getByTestId('pickup-list-row')).toBeTruthy();
    expect(screen.getByTestId('pickup-input-rtl')).toBeTruthy();
    expect(screen.getByTestId('pickup-kpi-stat')).toBeTruthy();
    expect(screen.getByTestId('pickup-claim-badge').getAttribute('data-claim')).toBe('this-device');
    expect(screen.getByTestId('pickup-claim-badge').getAttribute('data-tone')).toBe('success');

    fireEvent.click(screen.getByTestId('pickup-filter-chip'));
    expect(onChip).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('pickup-quantity-stepper-inc'));
    expect(onInc).toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <ScreenState variant="error" onRetry={onRetry} />
        <ClaimBadge
          claim={{
            deviceLabel: 'B',
            isClaimedByCurrentDevice: true,
            expiresSoon: true,
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pickup-screen-state-retry')).toBeTruthy();
    expect(screen.getByTestId('pickup-claim-badge').getAttribute('data-claim')).toBe('expires-soon');
    expect(screen.getByTestId('pickup-claim-badge').getAttribute('data-tone')).toBe('warn');

    rerender(
      <MemoryRouter>
        <ClaimBadge claim={{ deviceLabel: 'C', isClaimedByCurrentDevice: false }} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pickup-claim-badge').getAttribute('data-claim')).toBe('other-device');
    expect(screen.getByTestId('pickup-claim-badge').getAttribute('data-tone')).toBe('neutral');
  });
});
