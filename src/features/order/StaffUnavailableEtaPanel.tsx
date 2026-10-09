/**
 * Spec A11 — staff marks ITEM or ORDER unavailable (≠ refuse).
 * Spec A6 — staff updates promised ETA.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageSectionHeader } from '../../shared/ui/PageSectionHeader.js';
import type { FulfillmentLine } from '../../types.js';
import { formatFulfillmentLineLabel } from './formatFulfillmentLineLabel.js';

export interface StaffUnavailableEtaPanelProps {
  readonly lines: readonly FulfillmentLine[];
  readonly promisedPickupAt: string | null | undefined;
  readonly isOnHold: boolean;
  readonly isCoolingDown: boolean;
  readonly onMarkUnavailable: (input: {
    scope: 'ITEM' | 'ORDER';
    lineIds?: number[];
  }) => void;
  readonly onUpdatePromisedEta: (promisedPickupAtIso: string) => void;
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (iso == null || iso.trim().length === 0) {
    return '';
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return '';
  }
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StaffUnavailableEtaPanel({
  lines,
  promisedPickupAt,
  isOnHold,
  isCoolingDown,
  onMarkUnavailable,
  onUpdatePromisedEta,
}: StaffUnavailableEtaPanelProps): JSX.Element {
  const { t } = useTranslation();
  const openLines = lines.filter((l) => l.quantityRemaining > 0 && l.status !== 'REFUSED');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [etaLocal, setEtaLocal] = useState(() => toDatetimeLocalValue(promisedPickupAt));
  const disabled = isOnHold || isCoolingDown;

  const selectedIds = openLines
    .filter((l) => selected[l.lineId] === true)
    .map((l) => l.lineId);

  const lineFallback = t('pickup.order.line');

  return (
    <div className="flex flex-col gap-[var(--pickup-space-4)]" data-testid="pickup-staff-a11-eta">
      <div>
        <PageSectionHeader
          title={t('pickup.unavailable.title')}
        />
        <p className="m-0 mb-2 text-xs text-[var(--color-on-surface-muted)]">
          {t('pickup.unavailable.hint')}
        </p>
        <ul className="m-0 mb-2 list-none p-0">
          {openLines.map((line) => {
            const label = formatFulfillmentLineLabel(line, lineFallback);
            return (
              <li key={line.lineId} className="mb-1">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected[line.lineId] === true}
                    disabled={disabled}
                    data-testid={`pickup-unavailable-line-${line.lineId}`}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [line.lineId]: e.target.checked }))
                    }
                  />
                  <span data-testid={`pickup-unavailable-line-label-${line.lineId}`}>
                    {label} ({line.quantityRemaining})
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            intent="secondary"
            data-testid="pickup-mark-unavailable-items"
            disabled={disabled || selectedIds.length === 0}
            onClick={() => onMarkUnavailable({ scope: 'ITEM', lineIds: selectedIds })}
          >
            {t('pickup.unavailable.markItems')}
          </Button>
          <Button
            type="button"
            intent="danger"
            data-testid="pickup-mark-unavailable-order"
            disabled={disabled || openLines.length === 0}
            onClick={() => onMarkUnavailable({ scope: 'ORDER' })}
          >
            {t('pickup.unavailable.markOrder')}
          </Button>
        </div>
      </div>

      <div>
        <PageSectionHeader
          title={t('pickup.eta.title')}
        />
        <MetaRow
          label={t('pickup.eta.current')}
          value={
            promisedPickupAt != null && promisedPickupAt.length > 0
              ? promisedPickupAt
              : t('pickup.common.dash')
          }
        />
        <label className="mt-2 flex flex-col gap-1 text-sm" htmlFor="pickup-promised-eta-input">
          {t('pickup.eta.newLabel')}
          <input
            id="pickup-promised-eta-input"
            type="datetime-local"
            data-testid="pickup-promised-eta-input"
            value={etaLocal}
            disabled={disabled}
            onChange={(e) => setEtaLocal(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-2"
          />
        </label>
        <div className="mt-2">
          <Button
            type="button"
            intent="secondary"
            data-testid="pickup-update-promised-eta"
            disabled={disabled || etaLocal.trim().length === 0}
            onClick={() => {
              const ms = Date.parse(etaLocal);
              if (!Number.isFinite(ms)) {
                return;
              }
              onUpdatePromisedEta(new Date(ms).toISOString());
            }}
          >
            {t('pickup.eta.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
