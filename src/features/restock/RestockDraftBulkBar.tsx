import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BulkActionBar } from '../../shared/ui/BulkActionBar.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';

export interface RestockDraftBulkBarProps {
  readonly selectedCount: number;
  readonly isBusy?: boolean;
  readonly onClear: () => void;
  readonly onIncrementSelected: () => void;
  readonly onRemoveSelected: () => void;
}

/**
 * Restock draft BulkActionBar consumer — ProductsBulkBar pattern.
 * Pickup Button has no subtleDanger; remove uses secondary.
 */
export const RestockDraftBulkBar = memo<RestockDraftBulkBarProps>(
  ({
    selectedCount,
    isBusy = false,
    onClear,
    onIncrementSelected,
    onRemoveSelected,
  }): JSX.Element | null => {
    const { t } = useTranslation('pickup');

    return (
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={onClear}
        isBusy={isBusy}
        testId="restock-draft-bulk-bar"
      >
        <Button
          type="button"
          intent="secondary"
          size="sm"
          className="min-h-11"
          disabled={isBusy}
          data-testid="restock-increment-selected"
          onClick={onIncrementSelected}
        >
          {t('pickup.restock.incrementSelected')}
        </Button>
        <Button
          type="button"
          intent="secondary"
          size="sm"
          className="min-h-11"
          disabled={isBusy}
          data-testid="restock-remove-selected"
          onClick={onRemoveSelected}
        >
          {t('pickup.restock.removeSelected')}
        </Button>
      </BulkActionBar>
    );
  },
);

RestockDraftBulkBar.displayName = 'RestockDraftBulkBar';
