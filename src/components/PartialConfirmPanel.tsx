import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FulfillmentLine } from '../types';
import { Button, Card, FormField } from '../shared/ui/surfacePrimitives.js';

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
  onConfirmFull: () => void;
  onConfirmPartial: () => void;
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
  onConfirmFull,
  onConfirmPartial,
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

  const handleConfirmFull = useCallback((): void => {
    setConfirmInProgress(true);
    onConfirmFull();
  }, [onConfirmFull]);

  const handleConfirmPartial = useCallback((): void => {
    setConfirmInProgress(true);
    onConfirmPartial();
  }, [onConfirmPartial]);

  return (
    <Card
      className="mt-4"
      {...(criticalActive ? { 'data-pickup-critical-flow': 'true' as const } : {})}
    >
      <h2>{t('pickup.partial.confirm')}</h2>

      {lines.length > 0 ? (
        <div className="pickup-table-scroll w-full" data-testid="pickup-order-table-scroll">
          <table className="w-full border-collapse overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]">
            <thead>
              <tr>
                <th className="border-b border-[var(--color-border)] p-3 text-left">
                  {t('pickup.order.line')}
                </th>
                <th className="border-b border-[var(--color-border)] p-3 text-left">
                  {t('pickup.order.ordered')}
                </th>
                <th className="border-b border-[var(--color-border)] p-3 text-left">
                  {t('pickup.order.collected')}
                </th>
                <th className="border-b border-[var(--color-border)] p-3 text-left">
                  {t('pickup.order.refused')}
                </th>
                <th className="border-b border-[var(--color-border)] p-3 text-left">
                  {t('pickup.order.remaining')}
                </th>
                <th className="border-b border-[var(--color-border)] p-3 text-left">
                  {t('pickup.partial.confirm')}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.lineId}>
                  <td className="border-b border-[var(--color-border)] p-3 text-left">{line.lineId}</td>
                  <td className="border-b border-[var(--color-border)] p-3 text-left">
                    {line.quantityOrdered}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-3 text-left">
                    {line.quantityCollected}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-3 text-left">
                    {line.quantityRefused}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-3 text-left">
                    {line.quantityRemaining}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-3 text-left">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={partialSelected[line.lineId] ?? false}
                        aria-label={t('pickup.partial.selectLine', { lineId: line.lineId })}
                        onChange={(event) => onToggleLine(line.lineId, event.target.checked)}
                        disabled={line.quantityRemaining <= 0}
                      />
                      <Button
                        intent="secondary"
                        size="sm"
                        type="button"
                        className="min-h-11 min-w-11"
                        aria-label={t('pickup.partial.decrease')}
                        disabled={!partialSelected[line.lineId] || (partialQty[line.lineId] ?? 0) <= 0}
                        onClick={() =>
                          onChangeQty(line.lineId, Math.max(0, (partialQty[line.lineId] ?? 0) - 1))
                        }
                      >
                        −
                      </Button>
                      <span className="min-w-8 text-center font-semibold">
                        {partialQty[line.lineId] ?? 0}
                      </span>
                      <Button
                        intent="secondary"
                        size="sm"
                        type="button"
                        className="min-h-11 min-w-11"
                        aria-label={t('pickup.partial.increase')}
                        disabled={
                          !partialSelected[line.lineId] ||
                          (partialQty[line.lineId] ?? 0) >= line.quantityRemaining
                        }
                        onClick={() =>
                          onChangeQty(
                            line.lineId,
                            Math.min(line.quantityRemaining, (partialQty[line.lineId] ?? 0) + 1)
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {requiresPickupCode ? (
        <FormField
          surface="pickup"
          label={t('pickup.partial.pickupCode')}
          value={pickupCode}
          onChange={(event) => onPickupCodeChange(event.target.value)}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          data-testid="pickup-confirm-full"
          onClick={handleConfirmFull}
          disabled={!canConfirm || isOnHold || confirmInProgress}
        >
          {t('pickup.partial.confirmFull')}
        </Button>
        <Button
          intent="secondary"
          type="button"
          onClick={handleConfirmPartial}
          disabled={!canConfirm || isOnHold || confirmInProgress}
        >
          {t('pickup.partial.confirm')}
        </Button>
      </div>
    </Card>
  );
}
