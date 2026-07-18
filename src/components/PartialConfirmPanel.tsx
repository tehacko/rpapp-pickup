import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FulfillmentLine } from '../types';
import { Button, FormField } from '../shared/ui/surfacePrimitives.js';
import { OrderLineRow } from '../shared/ui/OrderLineRow.js';
import { QuantityStepper } from '../shared/ui/QuantityStepper.js';
import { SectionCard } from '../shared/ui/SectionCard.js';

interface PartialConfirmPanelProps {
  lines: FulfillmentLine[];
  partialQty: Record<number, number>;
  partialSelected: Record<number, boolean>;
  pickupCode: string;
  requiresPickupCode: boolean;
  canConfirm: boolean;
  isOnHold: boolean;
  onPickupCodeChange: (value: string) => void;
  onToggleLine: (lineId: number, selected: boolean) => void;
  onChangeQty: (lineId: number, qty: number) => void;
  onConfirmPartial: () => void;
  /** When true, omit outer SectionCard (parent owns card chrome). */
  embedded?: boolean;
}

export function PartialConfirmPanel({
  lines,
  partialQty,
  partialSelected,
  pickupCode,
  requiresPickupCode,
  canConfirm,
  isOnHold,
  onPickupCodeChange,
  onToggleLine,
  onChangeQty,
  onConfirmPartial,
  embedded = false,
}: PartialConfirmPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [confirmInProgress, setConfirmInProgress] = useState(false);
  const criticalActive = confirmInProgress && canConfirm && !isOnHold;

  useEffect(() => {
    if (!criticalActive) {
      return;
    }
    document.documentElement.setAttribute('data-pickup-critical-flow', 'true');
    return (): void => {
      document.documentElement.removeAttribute('data-pickup-critical-flow');
    };
  }, [criticalActive]);

  const handleConfirmPartial = useCallback((): void => {
    setConfirmInProgress(true);
    onConfirmPartial();
  }, [onConfirmPartial]);

  // G10: when embedded, OrderScreen sticky owns Confirm Full — omit in-panel confirm
  // (no pickup-partial-confirm). Non-embedded keeps footer confirm CTA.
  const confirmButton = (
    <Button
      intent="secondary"
      type="button"
      onClick={handleConfirmPartial}
      disabled={!canConfirm || isOnHold || confirmInProgress}
      data-testid="pickup-partial-confirm"
    >
      {t('pickup.partial.confirm')}
    </Button>
  );

  const linesBlock: ReactNode =
    lines.length > 0 ? (
      <div className="pickup-table-scroll flex flex-col" data-testid="pickup-order-table-scroll">
        {lines.map((line) => {
          const selected = partialSelected[line.lineId] ?? false;
          const qty = partialQty[line.lineId] ?? 0;
          const lineDisabled = line.quantityRemaining <= 0 || isOnHold;
          return (
            <OrderLineRow
              key={line.lineId}
              testId={`pickup-partial-line-${line.lineId}`}
              label={`${t('pickup.order.line')} #${line.lineId}`}
              meta={`${t('pickup.order.ordered')} ${line.quantityOrdered} · ${t('pickup.order.collected')} ${line.quantityCollected} · ${t('pickup.order.remaining')} ${line.quantityRemaining}`}
              selected={selected}
              disabled={lineDisabled}
              onToggle={(nextSelected) => onToggleLine(line.lineId, nextSelected)}
              trailing={
                <QuantityStepper
                  value={qty}
                  min={0}
                  max={line.quantityRemaining}
                  disabled={!selected || lineDisabled}
                  aria-label={t('pickup.partial.qty', {
                    defaultValue: `Line ${String(line.lineId)} quantity`,
                  })}
                  testId={`pickup-partial-qty-${line.lineId}`}
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
    ) : null;

  const codeBlock =
    requiresPickupCode ? (
      <div className="mt-3">
        <FormField
          id="pickup-partial-pickup-code"
          label={t('pickup.partial.pickupCode')}
          value={pickupCode}
          onChange={(event) => onPickupCodeChange(event.target.value)}
        />
      </div>
    ) : null;

  if (embedded) {
    return (
      <div
        {...(criticalActive ? { 'data-pickup-critical-flow': 'true' as const } : {})}
        data-testid="pickup-partial-confirm-panel"
      >
        {linesBlock}
        {codeBlock}
      </div>
    );
  }

  return (
    <div {...(criticalActive ? { 'data-pickup-critical-flow': 'true' as const } : {})}>
      <SectionCard
        title={t('pickup.partial.confirm')}
        elevated
        data-testid="pickup-partial-confirm-panel"
        footer={confirmButton}
      >
        {linesBlock}
        {codeBlock}
      </SectionCard>
    </div>
  );
}
