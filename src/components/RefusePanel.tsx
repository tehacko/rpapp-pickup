import { useTranslation } from 'react-i18next';
import type { FulfillmentLine } from '../types';

interface RefusePanelProps {
  lines: FulfillmentLine[];
  refuseQty: Record<number, number>;
  refuseSelected: Record<number, boolean>;
  isOnHold: boolean;
  onToggleLine: (lineId: number, selected: boolean) => void;
  onChangeQty: (lineId: number, qty: number) => void;
  onRefuse: () => void;
}

export function RefusePanel({
  lines,
  refuseQty,
  refuseSelected,
  isOnHold,
  onToggleLine,
  onChangeQty,
  onRefuse,
}: RefusePanelProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="pickup-panel pickup-stack">
      <h2>{t('pickup.refuse.title')}</h2>
      <table className="pickup-table">
        <thead>
          <tr>
            <th>{t('pickup.order.line')}</th>
            <th>{t('pickup.order.remaining')}</th>
            <th>{t('pickup.refuse.title')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.lineId}>
              <td>{line.lineId}</td>
              <td>{line.quantityRemaining}</td>
              <td>
                <div className="pickup-line-controls">
                  <input
                    type="checkbox"
                    checked={refuseSelected[line.lineId] ?? false}
                    aria-label={t('pickup.refuse.selectLine', { lineId: line.lineId })}
                    onChange={(event) => onToggleLine(line.lineId, event.target.checked)}
                    disabled={line.quantityRemaining <= 0 || isOnHold}
                  />
                  <button
                    className="pickup-button pickup-button--secondary"
                    type="button"
                    aria-label={t('pickup.partial.decrease')}
                    disabled={!refuseSelected[line.lineId] || (refuseQty[line.lineId] ?? 0) <= 0}
                    onClick={() =>
                      onChangeQty(line.lineId, Math.max(0, (refuseQty[line.lineId] ?? 0) - 1))
                    }
                  >
                    −
                  </button>
                  <span className="pickup-qty">{refuseQty[line.lineId] ?? 0}</span>
                  <button
                    className="pickup-button pickup-button--secondary"
                    type="button"
                    aria-label={t('pickup.partial.increase')}
                    disabled={
                      !refuseSelected[line.lineId] ||
                      (refuseQty[line.lineId] ?? 0) >= line.quantityRemaining
                    }
                    onClick={() =>
                      onChangeQty(
                        line.lineId,
                        Math.min(line.quantityRemaining, (refuseQty[line.lineId] ?? 0) + 1)
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
      <button className="pickup-button" type="button" onClick={onRefuse} disabled={isOnHold}>
        {t('pickup.refuse.confirm')}
      </button>
    </section>
  );
}
