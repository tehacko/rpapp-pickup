import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BulkActionBar } from '../../shared/ui/BulkActionBar.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';

export interface RestockCatalogBulkBarProps {
  readonly selectedCount: number;
  readonly isBusy?: boolean;
  readonly onClear: () => void;
  readonly onAddSelected: () => void;
  readonly addEnabled: boolean;
}

/**
 * Restock catalog BulkActionBar consumer — ProductsBulkBar pattern.
 */
export const RestockCatalogBulkBar = memo<RestockCatalogBulkBarProps>(
  ({
    selectedCount,
    isBusy = false,
    onClear,
    onAddSelected,
    addEnabled,
  }): JSX.Element | null => {
    const { t } = useTranslation('pickup');

    return (
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={onClear}
        isBusy={isBusy}
        testId="restock-catalog-bulk-bar"
      >
        <Button
          type="button"
          intent="primary"
          size="sm"
          className="min-h-11"
          disabled={isBusy || !addEnabled}
          data-testid="restock-add-selected"
          onClick={onAddSelected}
        >
          {t('pickup.restock.addSelected')}
        </Button>
      </BulkActionBar>
    );
  },
);

RestockCatalogBulkBar.displayName = 'RestockCatalogBulkBar';
