/**
 * R46 / Exit #8 — Pickup FE consumer for GET /pickup/staff/complaints
 * (status / queue=awaiting-retrieval). Manual ops queue only — ≠ Legal 91+ auto.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import type { IRefundsGateway } from './IRefundsGateway.js';
import { refundsGateway } from './refundsGateway.js';
import type { ComplaintReadDTO } from './refundTypes.js';

export type PickupComplaintListQueue = 'awaiting-retrieval' | 'all';

export interface PickupComplaintListProps {
  readonly tenantCode: string;
  readonly accessToken: string;
  /** Default awaiting-retrieval (AWAITING_RETURN). Pass `all` for unfiltered list. */
  readonly queue?: PickupComplaintListQueue;
  /** Optional explicit status filter (e.g. AWAITING_RETURN). */
  readonly status?: string;
  readonly gateway?: IRefundsGateway;
  /** When staff selects a row, parent can bind caseId for detail/disposition. */
  readonly onSelectCase?: (row: ComplaintReadDTO) => void;
  readonly selectedCaseId?: string | null;
}

function listQuery(
  queue: PickupComplaintListQueue,
  status: string | undefined,
): { readonly status?: string; readonly queue?: string } | undefined {
  if (status != null && status.trim().length > 0) {
    return { status: status.trim() };
  }
  if (queue === 'awaiting-retrieval') {
    return { queue: 'awaiting-retrieval' };
  }
  return undefined;
}

export function PickupComplaintList({
  tenantCode,
  accessToken,
  queue = 'awaiting-retrieval',
  status,
  gateway = refundsGateway,
  onSelectCase,
  selectedCaseId = null,
}: PickupComplaintListProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const query = listQuery(queue, status);

  const listQueryResult = useQuery({
    queryKey: ['pickup-staff-complaints', tenantCode, query?.status ?? null, query?.queue ?? null],
    queryFn: () => gateway.listComplaints(tenantCode, accessToken, query),
  });

  const rows = listQueryResult.data ?? [];

  return (
    <SectionCard
      title={t('pickup.complaints.listTitle')}
      data-testid="pickup-complaint-list"
    >
      <p
        className="m-0 mb-2 text-sm text-[var(--color-on-surface-muted)]"
        data-testid="pickup-complaint-list-hint"
      >
        {t('pickup.complaints.listHint')}
      </p>

      {listQueryResult.isLoading ? (
        <p className="m-0 text-sm" data-testid="pickup-complaint-list-loading">
          {t('pickup.complaints.listLoading')}
        </p>
      ) : null}

      {listQueryResult.isError ? (
        <p
          className="m-0 text-sm text-[var(--color-danger)]"
          data-testid="pickup-complaint-list-error"
        >
          {listQueryResult.error instanceof Error
            ? listQueryResult.error.message
            : t('pickup.complaints.listLoadFailed')}
        </p>
      ) : null}

      {!listQueryResult.isLoading &&
      !listQueryResult.isError &&
      rows.length === 0 ? (
        <p
          className="m-0 text-sm text-[var(--color-on-surface-muted)]"
          data-testid="pickup-complaint-list-empty"
        >
          {t('pickup.complaints.listEmpty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul
          className="m-0 flex list-none flex-col gap-2 p-0"
          data-testid="pickup-complaint-list-rows"
        >
          {rows.map((row) => {
            const selected = selectedCaseId === row.caseId;
            return (
              <li key={row.caseId} className="m-0 p-0">
                <button
                  type="button"
                  className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-2 text-left text-sm ${
                    selected
                      ? 'border-[var(--color-primary)] bg-[var(--color-surface-elevated)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}
                  data-testid={`pickup-complaint-list-row-${row.caseId}`}
                  aria-pressed={selected}
                  onClick={() => {
                    onSelectCase?.(row);
                  }}
                >
                  <span className="min-w-0 font-medium truncate">{row.caseId}</span>
                  <span className="text-[var(--color-on-surface-muted)]">
                    {row.status}
                    {row.transactionId != null ? ` · txn #${row.transactionId}` : ''}
                    {row.requestedRemedy != null ? ` · ${row.requestedRemedy}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}