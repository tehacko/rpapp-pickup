import type { LucideIcon } from 'lucide-react';
import {
  Barcode,
  ClipboardCheck,
  ListOrdered,
  Package,
  PackageMinus,
  PackagePlus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PickupKpiCard, type PickupKpiTone } from '../../shared/ui/PickupKpiCard.js';
import { PickupKpiGrid } from '../../shared/ui/PickupKpiGrid.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';

export interface StaffHubKpiStripProps {
  readonly viewModel: StaffHubViewModel;
}

interface HubKpiSpec {
  readonly id: string;
  readonly testId: string;
  readonly labelKey: string;
  readonly hint: string;
  readonly value: string | number;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly tone: PickupKpiTone;
}

function buildKpis(viewModel: StaffHubViewModel, t: (key: string, opts?: Record<string, unknown>) => string): HubKpiSpec[] {
  const encoded = encodeURIComponent(viewModel.tenantCode);
  const kpis: HubKpiSpec[] = [];
  if (viewModel.canAssign && viewModel.barcodeStats.loadState === 'ready') {
    kpis.push({
      id: 'missing',
      testId: 'hub-kpi-missing-barcodes',
      labelKey: 'pickup.hub.kpi.missingBarcodes',
      hint: t('pickup.hub.kpi.hint.tagged', {
        tagged: viewModel.barcodeStats.withCodeCount,
        total: viewModel.barcodeStats.assignableCount,
      }),
      value: viewModel.barcodeStats.missingCount,
      href: `/${encoded}/barcode-assign`,
      icon: Barcode,
      tone: viewModel.barcodeStats.missingCount > 0 ? 'warn' : 'success',
    });
  }
  if (viewModel.canResupply && viewModel.stockStats.loadState === 'ready') {
    kpis.push({
      id: 'out',
      testId: 'hub-kpi-out-of-stock',
      labelKey: 'pickup.hub.kpi.outOfStock',
      hint: t('pickup.hub.kpi.hint.skus', { count: viewModel.stockStats.skuCount }),
      value: viewModel.stockStats.outOfStockCount,
      href: `/${encoded}/restock`,
      icon: PackageMinus,
      tone: viewModel.stockStats.outOfStockCount > 0 ? 'danger' : 'success',
    });
    kpis.push({
      id: 'below',
      testId: 'hub-kpi-below-reorder',
      labelKey: 'pickup.hub.kpi.belowReorder',
      hint: t('pickup.hub.kpi.hint.reorder'),
      value: viewModel.stockStats.belowReorderCount,
      href: `/${encoded}/restock`,
      icon: Package,
      tone: viewModel.stockStats.belowReorderCount > 0 ? 'warn' : 'success',
    });
  }
  if (viewModel.canResupply && viewModel.stockStats.draftsLoadState === 'ready' && viewModel.stockStats.draftBatchCount > 0) {
    kpis.push({
      id: 'drafts',
      testId: 'hub-kpi-restock-drafts',
      labelKey: 'pickup.hub.kpi.draftRestock',
      hint: t('pickup.hub.kpi.hint.drafts'),
      value: viewModel.stockStats.draftBatchCount,
      href: `/${encoded}/restock`,
      icon: PackagePlus,
      tone: viewModel.stockStats.draftBatchCount > 0 ? 'warn' : 'neutral',
    });
  }
  if (viewModel.canResupply && viewModel.checkupStats.loadState === 'ready') {
    kpis.push({
      id: 'checkup',
      testId: 'hub-kpi-open-checkup',
      labelKey: 'pickup.hub.kpi.openCheckup',
      hint: t('pickup.hub.kpi.hint.checkup', {
        uncounted: viewModel.checkupStats.uncountedCount,
        total: viewModel.checkupStats.lineCount,
      }),
      value: viewModel.checkupStats.openCount,
      href: `/${encoded}/checkup`,
      icon: ClipboardCheck,
      tone: viewModel.checkupStats.openCount > 0 ? 'warn' : 'success',
    });
  }
  if (viewModel.canScan && viewModel.queueStats.loadState === 'ready') {
    kpis.push({
      id: 'queue',
      testId: 'hub-kpi-queue',
      labelKey: 'pickup.hub.kpi.queue',
      hint: t('pickup.hub.kpi.hint.queue', { claimed: viewModel.queueStats.claimedCount }),
      value: viewModel.queueStats.waitingCount,
      href: `/${encoded}/queue`,
      icon: ListOrdered,
      tone: viewModel.queueStats.waitingCount > 0 ? 'warn' : 'success',
    });
  }
  return kpis;
}

export function StaffHubKpiStrip({ viewModel }: StaffHubKpiStripProps): JSX.Element | null {
  const { t } = useTranslation('pickup');
  const kpis = buildKpis(viewModel, t);
  if (kpis.length === 0) {
    return null;
  }

  return (
    <PickupKpiGrid testId="hub-kpi-grid" aria-label={t('pickup.hub.statsTitle')}>
      {kpis.map((kpi) => (
        <PickupKpiCard
          key={kpi.id}
          label={t(kpi.labelKey)}
          value={kpi.value}
          hint={kpi.hint}
          href={kpi.href}
          icon={kpi.icon}
          tone={kpi.tone}
          testId={kpi.testId}
        />
      ))}
    </PickupKpiGrid>
  );
}
