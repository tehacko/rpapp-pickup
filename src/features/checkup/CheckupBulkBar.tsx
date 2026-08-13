import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BulkActionBar } from '../../shared/ui/BulkActionBar.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';

export interface CheckupBulkBarProps {
  readonly selectedCount: number;
  readonly isBusy?: boolean;
  readonly onClear: () => void;
  readonly onAcceptSelected: () => void;
  readonly acceptSelectedEnabled: boolean;
}

/**
 * Checkup BulkActionBar consumer — admin ProductsBulkBar pattern.
 */
export const CheckupBulkBar = memo<CheckupBulkBarProps>(
  ({
    selectedCount,
    isBusy = false,
    onClear,
    onAcceptSelected,
    acceptSelectedEnabled,
  }): JSX.Element | null => {
    const { t } = useTranslation('pickup');

    return (
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={onClear}
        isBusy={isBusy}
        testId="checkup-bulk-bar"
      >
        <Button
          type="button"
          intent="primary"
          size="sm"
          className="min-h-11"
          disabled={!acceptSelectedEnabled || isBusy}
          data-testid="checkup-accept-selected"
          onClick={onAcceptSelected}
        >
          {t('pickup.checkup.acceptSelectedCount', { count: selectedCount })}
        </Button>
      </BulkActionBar>
    );
  },
);

CheckupBulkBar.displayName = 'CheckupBulkBar';
