import { useTranslation } from 'react-i18next';
import type { FulfillmentLine } from '../types';

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

  return (
    <section className="pickup-panel pickup-stack">
      <h2>{t('pickup.partial.confirm')}</h2>

      {lines.length > 0 ? (
        <table className="pickup-table">
          <thead>
            <tr>
              <th>{t('pickup.order.line')}</th>
              <th>{t('pickup.order.ordered')}</th>
              <th>{t('pickup.order.collected')}</th>
              <th>{t('pickup.order.refused')}</th>
              <th>{t('pickup.order.remaining')}</th>
              <th>{t('pickup.partial.confirm')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.lineId}>
                <td>{line.lineId}</td>
                <td>{line.quantityOrdered}</td>
                <td>{line.quantityCollected}</td>
                <td>{line.quantityRefused}</td>
                <td>{line.quantityRemaining}</td>
                <td>
                  <div className="pickup-line-controls">
                    <input
                      type="checkbox"
                      checked={partialSelected[line.lineId] ?? false}
                      aria-label={t('pickup.partial.selectLine', { lineId: line.lineId })}
                      onChange={(event) => onToggleLine(line.lineId, event.target.checked)}
                      disabled={line.quantityRemaining <= 0}
                    />
                    <button
                      className="pickup-button pickup-button--secondary"
                      type="button"
                      aria-label={t('pickup.partial.decrease')}
                      disabled={!partialSelected[line.lineId] || (partialQty[line.lineId] ?? 0) <= 0}
                      onClick={() =>
                        onChangeQty(line.lineId, Math.max(0, (partialQty[line.lineId] ?? 0) - 1))
                      }
                    >
                      −
                    </button>
                    <span className="pickup-qty">{partialQty[line.lineId] ?? 0}</span>
                    <button
                      className="pickup-button pickup-button--secondary"
                      type="button"
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
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {requiresPickupCode ? (
        <label className="pickup-label">
          {t('pickup.partial.pickupCode')}
          <input
            className="pickup-input"
            value={pickupCode}
            onChange={(event) => onPickupCodeChange(event.target.value)}
          />
        </label>
      ) : null}

      <div className="pickup-row">
        <button
          className="pickup-button"
          type="button"
          data-testid="pickup-confirm-full"
          onClick={onConfirmFull}
          disabled={!canConfirm || isOnHold}
        >
          {t('pickup.partial.confirmFull')}
        </button>
        <button
          className="pickup-button pickup-button--secondary"
          type="button"
          onClick={onConfirmPartial}
          disabled={!canConfirm || isOnHold}
        >
          {t('pickup.partial.confirm')}
        </button>
      </div>
    </section>
  );
}
