import { useTranslation } from 'react-i18next';
import type { FulfillmentLine } from '../types';
import { Button, Card } from '../shared/ui/surfacePrimitives.js';

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
    <Card className="mt-4">
      <h2>{t('pickup.refuse.title')}</h2>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]">
          <thead>
            <tr>
              <th className="border-b border-[var(--color-border)] p-3 text-left">
                {t('pickup.order.line')}
              </th>
              <th className="border-b border-[var(--color-border)] p-3 text-left">
                {t('pickup.order.remaining')}
              </th>
              <th className="border-b border-[var(--color-border)] p-3 text-left">
                {t('pickup.refuse.title')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.lineId}>
                <td className="border-b border-[var(--color-border)] p-3 text-left">{line.lineId}</td>
                <td className="border-b border-[var(--color-border)] p-3 text-left">
                  {line.quantityRemaining}
                </td>
                <td className="border-b border-[var(--color-border)] p-3 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={refuseSelected[line.lineId] ?? false}
                      aria-label={t('pickup.refuse.selectLine', { lineId: line.lineId })}
                      onChange={(event) => onToggleLine(line.lineId, event.target.checked)}
                      disabled={line.quantityRemaining <= 0 || isOnHold}
                    />
                    <Button
                      intent="secondary"
                      size="sm"
                      type="button"
                      className="min-h-11 min-w-11"
                      aria-label={t('pickup.partial.decrease')}
                      disabled={!refuseSelected[line.lineId] || (refuseQty[line.lineId] ?? 0) <= 0}
                      onClick={() =>
                        onChangeQty(line.lineId, Math.max(0, (refuseQty[line.lineId] ?? 0) - 1))
                      }
                    >
                      −
                    </Button>
                    <span className="min-w-8 text-center font-semibold">
                      {refuseQty[line.lineId] ?? 0}
                    </span>
                    <Button
                      intent="secondary"
                      size="sm"
                      type="button"
                      className="min-h-11 min-w-11"
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
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" onClick={onRefuse} disabled={isOnHold}>
        {t('pickup.refuse.confirm')}
      </Button>
    </Card>
  );
}
