import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './surfacePrimitives.js';

export interface BulkActionBarProps {
  readonly selectedCount: number;
  readonly onClear: () => void;
  readonly children?: ReactNode;
  readonly testId?: string;
  readonly clearTestId?: string;
  readonly selectedLabel?: string;
  readonly clearLabel?: string;
  readonly isBusy?: boolean;
}

/**
 * Spec1-P9 BulkActionBar — count + ops + cancel → restore standard toolbar.
 * Sticky list-toolbar allowlist (not viewport-fixed). Pickup Sailor tokens.
 */
export const BulkActionBar = memo<BulkActionBarProps>(
  ({
    selectedCount,
    onClear,
    children,
    testId = 'bulk-action-bar',
    clearTestId,
    selectedLabel,
    clearLabel,
    isBusy = false,
  }): JSX.Element | null => {
    const { t } = useTranslation('pickup');

    if (selectedCount < 1) {
      return null;
    }

    const resolvedSelected =
      selectedLabel ?? t('pickup.bulk.selected', { count: selectedCount });
    const resolvedClear = clearLabel ?? t('pickup.bulk.clear');
    const resolvedClearTestId = clearTestId ?? `${testId}-clear`;

    return (
      <div
        className="pointer-events-none sticky top-0 z-[var(--z-toolbar,20)] flex justify-center px-4 py-2"
        data-testid={testId}
        data-sticky-allowlist="list-toolbar"
      >
        <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 shadow-[var(--shadow-card)]">
          <span className="text-sm font-medium">{resolvedSelected}</span>
          {children}
          <Button
            type="button"
            intent="ghost"
            size="sm"
            className="min-h-11"
            disabled={isBusy}
            data-testid={resolvedClearTestId}
            onClick={onClear}
          >
            {resolvedClear}
          </Button>
        </div>
      </div>
    );
  },
);

BulkActionBar.displayName = 'BulkActionBar';
