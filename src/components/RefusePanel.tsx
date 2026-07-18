import { useTranslation } from 'react-i18next';
import type { FulfillmentLine } from '../types';
import { OrderLineRow } from '../shared/ui/OrderLineRow.js';
import { QuantityStepper } from '../shared/ui/QuantityStepper.js';
import { SectionCard } from '../shared/ui/SectionCard.js';
import { PageSectionHeader } from '../shared/ui/PageSectionHeader.js';

interface RefusePanelProps {
  lines: FulfillmentLine[];
  refuseQty: Record<number, number>;
  refuseSelected: Record<number, boolean>;
  isOnHold: boolean;
  onToggleLine: (lineId: number, selected: boolean) => void;
  onChangeQty: (lineId: number, qty: number) => void;
  /** When true, omit outer SectionCard (parent owns card chrome). */
  embedded?: boolean;
}

export function RefusePanel({
  lines,
  refuseQty,
  refuseSelected,
  isOnHold,
  onToggleLine,
  onChangeQty,
  embedded = false,
}: RefusePanelProps): JSX.Element {
  const { t } = useTranslation();

  const body = (
    <div className="flex flex-col">
      {lines.map((line) => {
        const selected = refuseSelected[line.lineId] ?? false;
        const qty = refuseQty[line.lineId] ?? 0;
        const lineDisabled = line.quantityRemaining <= 0 || isOnHold;
        return (
          <OrderLineRow
            key={line.lineId}
            testId={`pickup-refuse-line-${line.lineId}`}
            label={`${t('pickup.order.line')} #${line.lineId}`}
            meta={`${t('pickup.order.remaining')} ${line.quantityRemaining}`}
            selected={selected}
            disabled={lineDisabled}
            onToggle={(nextSelected) => onToggleLine(line.lineId, nextSelected)}
            trailing={
              <QuantityStepper
                value={qty}
                min={0}
                max={line.quantityRemaining}
                disabled={!selected || lineDisabled}
                aria-label={t('pickup.refuse.qty', {
                  defaultValue: `Line ${String(line.lineId)} refuse quantity`,
                })}
                testId={`pickup-refuse-qty-${line.lineId}`}
                onDec={() => onChangeQty(line.lineId, Math.max(0, qty - 1))}
                onInc={() =>
                  onChangeQty(line.lineId, Math.min(line.quantityRemaining, qty + 1))
                }
              />
            }
          />
        );
      })}
    </div>
  );

  if (embedded) {
    return (
      <div data-testid="pickup-refuse-panel">
        <PageSectionHeader title={t('pickup.refuse.title')} />
        {body}
      </div>
    );
  }

  return (
    <SectionCard title={t('pickup.refuse.title')} elevated data-testid="pickup-refuse-panel">
      {body}
    </SectionCard>
  );
}
