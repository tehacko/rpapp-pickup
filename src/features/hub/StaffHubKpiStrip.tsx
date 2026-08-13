import type { LucideIcon } from 'lucide-react';
import {
  Barcode,
  ClipboardCheck,
  ListOrdered,
  Package,
  PackageMinus,
  PackagePlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../shared/ui/cn.js';
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
  readonly tone: 'neutral' | 'warn' | 'danger' | 'success';
}

function kpiToneClass(tone: HubKpiSpec['tone']): string {
  if (tone === 'danger') {
    return 'border-[color-mix(in_oklab,var(--color-danger)_40%,var(--color-border))]';
  }
  if (tone === 'warn') {
    return 'border-[color-mix(in_oklab,var(--color-warning)_40%,var(--color-border))]';
  }
  if (tone === 'success') {
    return 'border-[color-mix(in_oklab,var(--color-success)_40%,var(--color-border))]';
  }
  return '';
}

function iconToneClass(tone: HubKpiSpec['tone']): string {
  if (tone === 'danger') {
    return 'text-[var(--color-danger)]';
  }
  if (tone === 'warn') {
    return 'text-[var(--color-warning)]';
  }
  if (tone === 'success') {
    return 'text-[var(--color-success)]';
  }
  return 'text-[var(--color-on-surface)]';
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
    <section
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      data-testid="hub-kpi-grid"
      aria-label={t('pickup.hub.statsTitle')}
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Link
            key={kpi.id}
            to={kpi.href}
            className={cn(
              'flex min-h-11 min-w-0 flex-col gap-0.5 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-2 no-underline',
              'hover:bg-[var(--color-surface-hover)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
              kpiToneClass(kpi.tone),
            )}
            data-testid={kpi.testId}
            aria-label={t(kpi.labelKey)}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0 text-xs font-medium uppercase tracking-wide text-[var(--color-on-surface-muted)]">
                {t(kpi.labelKey)}
              </span>
              <Icon
                className={cn('h-5 w-5 shrink-0 stroke-[1.75]', iconToneClass(kpi.tone))}
                aria-hidden
              />
            </span>
            <span className="text-xl font-bold tabular-nums text-[var(--color-on-surface)]">
              {kpi.value}
            </span>
            <span className="hidden text-xs leading-snug text-[var(--color-on-surface-muted)] sm:block">
              {kpi.hint}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
