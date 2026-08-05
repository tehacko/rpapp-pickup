import { memo, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { resolveDirectoryMonogram } from 'pi-kiosk-shared';
import type { PublicPickupTenantDTO } from './publicPickupTenantApi.js';
import { resolvePickupLandingLogoSrc } from './filterPickupLandingOrgs.js';

export interface TenantLandingOrgRowProps {
  readonly tenant: PublicPickupTenantDTO;
  readonly disabled?: boolean;
  readonly onSelect: (code: string) => void;
  readonly tileClassName?: string;
}

/**
 * Org picker cell — compact row on small screens; card tile on `lg+`.
 */
export const TenantLandingOrgRow = memo(
  ({
    tenant,
    disabled = false,
    onSelect,
    tileClassName = 'w-full',
  }: TenantLandingOrgRowProps): JSX.Element => {
    const logoSrc = useMemo(
      () => resolvePickupLandingLogoSrc(tenant.logoUrl),
      [tenant.logoUrl],
    );
    const [logoFailed, setLogoFailed] = useState(false);
    const monogram = useMemo(
      () =>
        resolveDirectoryMonogram({
          id: tenant.tenantId,
          displayName: tenant.name,
          code: tenant.code,
        }),
      [tenant.code, tenant.name, tenant.tenantId],
    );
    const showLogo = logoSrc !== null && !logoFailed;

    return (
      <li
        className={[
          tileClassName,
          'border-b border-[var(--color-border)] last:border-b-0',
          'lg:rounded-xl lg:border lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:shadow-sm lg:last:border',
        ].join(' ')}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onSelect(tenant.code);
          }}
          className={[
            'flex w-full items-center gap-3 px-3.5 py-3 text-start',
            'transition-colors duration-150',
            'hover:bg-[var(--color-surface-muted)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
            'focus-visible:outline-[var(--color-focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'lg:gap-4 lg:rounded-xl lg:px-5 lg:py-5',
          ].join(' ')}
          data-testid={`pickup-tenant-landing-row-${tenant.code}`}
        >
          <span
            className="relative inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] lg:h-20 lg:w-20"
            aria-hidden
          >
            {showLogo ? (
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => {
                  setLogoFailed(true);
                }}
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase tracking-tight lg:text-2xl"
                style={{
                  backgroundColor: monogram.backgroundColor,
                  color: monogram.textColor,
                }}
              >
                {monogram.label}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold leading-snug tracking-tight text-[var(--color-on-surface)] line-clamp-2 lg:text-base">
              {tenant.name}
            </span>
            <span className="mt-0.5 block truncate text-sm text-[var(--color-on-surface-muted)] lg:mt-1">
              {tenant.code}
            </span>
          </span>

          <ChevronRight
            className="h-5 w-5 shrink-0 text-[var(--color-on-surface-muted)] lg:h-6 lg:w-6"
            aria-hidden
          />
        </button>
      </li>
    );
  },
);

TenantLandingOrgRow.displayName = 'TenantLandingOrgRow';
