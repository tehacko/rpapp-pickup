import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../../shared/ui/surfacePrimitives.js';
import { Input } from '../../../shared/ui/Input.js';
import { SailorMark } from '../../../shared/ui/SailorMark.js';
import { rememberPickupLastTenant } from '../../../lib/pickupLastTenant.js';
import {
  filterPickupLandingOrgs,
  type PickupLandingOrgSortId,
} from './filterPickupLandingOrgs.js';
import {
  fetchPublicPickupTenants,
  type PublicPickupTenantDTO,
} from './publicPickupTenantApi.js';
import { TenantLandingOrgRow } from './TenantLandingOrgRow.js';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly tenants: readonly PublicPickupTenantDTO[] }
  | { readonly status: 'error'; readonly message: string };

const SEARCH_DEBOUNCE_MS = 200;
const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'] as const;
/** Tailwind `lg` — inline sort at this width and above (mobile uses Filters sheet). */
const LG_UP_MQ = '(min-width: 1024px)';

const ORG_LIST_CLASS =
  'overflow-hidden rounded-xl border border-[var(--color-border)] lg:flex lg:flex-wrap lg:justify-center lg:gap-3 lg:overflow-visible lg:border-0';

const ORG_TILE_WIDTH_CLASS =
  'w-full lg:w-[calc((100%-0.75rem)/2)] xl:w-[calc((100%-1.5rem)/3)]';

const CLOSE_BUTTON_CLASS = [
  'inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center',
  'rounded-full text-2xl leading-none text-[var(--color-on-surface-muted)]',
  'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-on-surface)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
].join(' ');

function useLgUp(): boolean {
  const [lgUp, setLgUp] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia(LG_UP_MQ).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(LG_UP_MQ);
    const onChange = (): void => {
      setLgUp(media.matches);
    };
    onChange();
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  return lgUp;
}

/**
 * Public entry when the visitor has no tenant in the URL.
 * Mirrors admin TenantLandingPage: search/sort directory → `/{tenant}/login`.
 * `/` never auto-skips to last-tenant hub (admin cold-start parity).
 */
export const TenantLandingPage = memo((): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchId = useId();
  const sortId = useId();
  const filterSheetTitleId = useId();
  const lgUp = useLgUp();

  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [isNavigating, setIsNavigating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [sort, setSort] = useState<PickupLandingOrgSortId>('nameAsc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoadState({ status: 'loading' });
      }
    });

    void fetchPublicPickupTenants(controller.signal)
      .then((tenants) => {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        setLoadState({ status: 'ready', tenants });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        const message =
          err instanceof Error && err.message.length > 0
            ? err.message
            : t('pickup.landing.loadError');
        setLoadState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(draftQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draftQuery]);

  // Close mobile filter sheet when crossing to desktop (listener callback — not sync setState-in-effect).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(LG_UP_MQ);
    const onChange = (): void => {
      if (media.matches) {
        setFilterSheetOpen(false);
      }
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  const visibleTenants = useMemo(() => {
    if (loadState.status !== 'ready') {
      return [];
    }
    return filterPickupLandingOrgs(loadState.tenants, { query, sort });
  }, [loadState, query, sort]);

  const filtersActive = query.trim().length > 0 || sort !== 'nameAsc';
  const facetsActive = sort !== 'nameAsc';

  const goToTenantLogin = useCallback(
    (code: string) => {
      const normalized = code.trim();
      if (normalized.length === 0 || isNavigating) {
        return;
      }
      setIsNavigating(true);
      rememberPickupLastTenant(normalized);
      navigate(`/${encodeURIComponent(normalized)}/login`, { replace: true });
    },
    [isNavigating, navigate],
  );

  const handleRetry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setDraftQuery('');
    setQuery('');
    setSort('nameAsc');
  }, []);

  const handleSortChange = useCallback((next: string) => {
    if (next === 'nameAsc' || next === 'nameDesc') {
      setSort(next);
    }
  }, []);

  const showFilters = loadState.status === 'ready' && loadState.tenants.length > 0;

  const sortSelect = (
    <div className="flex items-center gap-2 lg:w-56 lg:shrink-0">
      <label
        htmlFor={sortId}
        className="shrink-0 text-sm font-medium text-[var(--color-on-surface-muted)]"
      >
        {t('pickup.landing.sortLabel')}
      </label>
      <select
        id={sortId}
        value={sort}
        onChange={(e) => {
          handleSortChange(e.target.value);
        }}
        className="h-9 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-on-surface)] focus-visible:border-[var(--color-focus-ring)] focus-visible:outline-none lg:h-11"
        data-testid="pickup-tenant-landing-sort"
      >
        <option value="nameAsc">{t('pickup.landing.sortNameAsc')}</option>
        <option value="nameDesc">{t('pickup.landing.sortNameDesc')}</option>
      </select>
    </div>
  );

  const searchField = (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-muted)] stroke-[1.75]"
        aria-hidden
      />
      <Input
        type="search"
        id={searchId}
        value={draftQuery}
        onChange={(e) => {
          setDraftQuery(e.target.value);
        }}
        placeholder={t('pickup.landing.searchPlaceholder')}
        className="h-11 pl-10 text-base"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        data-testid="pickup-tenant-landing-search"
        aria-label={t('pickup.landing.searchPlaceholder')}
      />
    </div>
  );

  return (
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-8 md:px-6"
      data-testid="pickup-tenant-landing-screen"
    >
      <div className="mb-6 flex flex-col items-center gap-3 text-center lg:mb-8">
        <SailorMark size="lg" />
        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--color-on-surface-muted)]">
            {t('pickup.landing.brandLabel')}
          </p>
          <h1 className="m-0 mt-1.5 text-[1.5rem] font-semibold tracking-tight text-[var(--color-on-surface)] lg:text-3xl">
            {t('pickup.landing.title')}
          </h1>
          <p className="mx-auto mt-1.5 mb-0 max-w-xl text-sm leading-snug text-[var(--color-on-surface-muted)] lg:mt-2 lg:text-base lg:leading-relaxed">
            {t('pickup.landing.subtitle')}
          </p>
        </div>
      </div>

      {showFilters ? (
        <div
          className="mb-4 flex flex-col gap-2.5 lg:mb-6 lg:mx-auto lg:max-w-2xl lg:flex-row lg:items-end lg:justify-center lg:gap-4"
          data-testid="pickup-tenant-landing-filters"
          role="search"
        >
          {lgUp ? (
            <>
              {searchField}
              {sortSelect}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {searchField}
                <Button
                  type="button"
                  intent="secondary"
                  size="sm"
                  aria-expanded={filterSheetOpen}
                  aria-haspopup="dialog"
                  data-testid="pickup-tenant-landing-open-sheet"
                  onClick={() => {
                    setFilterSheetOpen(true);
                  }}
                  className={[
                    'relative inline-flex shrink-0 items-center justify-center gap-1.5',
                    'basis-[28%] max-w-[30%] min-w-[5.5rem]',
                    facetsActive
                      ? 'border-[var(--brand-consumer-accent)] ring-1 ring-[var(--brand-consumer-accent)]'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Filter className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t('pickup.landing.filtersButton')}</span>
                  {facetsActive ? (
                    <span
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-consumer-accent)]"
                      aria-hidden="true"
                      data-testid="pickup-tenant-landing-filters-active-badge"
                    />
                  ) : null}
                </Button>
              </div>
              {facetsActive ? (
                <p
                  className="text-xs text-[var(--color-on-surface-muted)]"
                  data-testid="pickup-tenant-landing-active-summary"
                >
                  {sort === 'nameDesc'
                    ? t('pickup.landing.sortNameDesc')
                    : t('pickup.landing.sortNameAsc')}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {filterSheetOpen && !lgUp ? (
        <div
          className="fixed inset-0 z-[var(--pickup-z-70)] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] motion-reduce:backdrop-blur-none sm:items-center sm:p-4"
          role="presentation"
          data-testid="pickup-tenant-landing-filter-sheet-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setFilterSheetOpen(false);
            }
          }}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl sm:rounded-2xl sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby={filterSheetTitleId}
            data-testid="pickup-tenant-landing-filter-sheet"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id={filterSheetTitleId}
                className="text-lg font-semibold text-[var(--color-on-surface)]"
              >
                {t('pickup.landing.filtersSheetTitle')}
              </h2>
              <button
                type="button"
                className={CLOSE_BUTTON_CLASS}
                onClick={() => {
                  setFilterSheetOpen(false);
                }}
                aria-label={t('shared.close')}
                data-testid="pickup-tenant-landing-filter-sheet-close"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {sortSelect}
              <div className="flex gap-2 border-t border-[var(--color-border)] pt-4">
                {facetsActive ? (
                  <Button
                    type="button"
                    intent="secondary"
                    size="sm"
                    className="flex-1"
                    data-testid="pickup-tenant-landing-filter-clear"
                    onClick={() => {
                      setSort('nameAsc');
                    }}
                  >
                    {t('pickup.landing.clearFilters')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  intent="primary"
                  size="sm"
                  className="flex-1"
                  data-testid="pickup-tenant-landing-filter-done"
                  onClick={() => {
                    setFilterSheetOpen(false);
                  }}
                >
                  {t('pickup.landing.filtersDone')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {loadState.status === 'error' ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-foreground)] px-3 py-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 stroke-[1.75]" aria-hidden />
            <span>{loadState.message}</span>
          </div>
          <Button
            type="button"
            intent="secondary"
            size="sm"
            onClick={handleRetry}
            data-testid="pickup-tenant-landing-retry"
          >
            <RefreshCw className="size-3.5 stroke-[1.75]" aria-hidden />
            {t('pickup.landing.retry')}
          </Button>
        </div>
      ) : null}

      {loadState.status === 'loading' ? (
        <ul
          className={ORG_LIST_CLASS}
          aria-busy
          aria-live="polite"
          data-testid="pickup-tenant-landing-skeleton"
        >
          {SKELETON_KEYS.map((key) => (
            <li
              key={key}
              className={`${ORG_TILE_WIDTH_CLASS} flex items-center gap-3 border-b border-[var(--color-border)] px-3.5 py-3 last:border-b-0 lg:rounded-xl lg:border lg:border-[var(--color-border)] lg:px-5 lg:py-5 lg:last:border`}
            >
              <span className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-[var(--color-surface-muted)] lg:h-20 lg:w-20" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="h-4 w-[66%] max-w-[11rem] animate-pulse rounded bg-[var(--color-surface-muted)]" />
                <span className="h-3 w-[40%] max-w-[7rem] animate-pulse rounded bg-[var(--color-surface-muted)]" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {loadState.status === 'ready' && loadState.tenants.length === 0 ? (
        <div
          className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-on-surface-muted)]"
          role="status"
          data-testid="pickup-tenant-landing-empty"
        >
          {t('pickup.landing.empty')}
        </div>
      ) : null}

      {loadState.status === 'ready' &&
      loadState.tenants.length > 0 &&
      visibleTenants.length === 0 ? (
        <div
          className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-on-surface-muted)]"
          role="status"
          data-testid="pickup-tenant-landing-no-matches"
        >
          <p className="m-0">{t('pickup.landing.noMatches')}</p>
          {filtersActive ? (
            <Button
              type="button"
              intent="secondary"
              size="sm"
              className="mt-3"
              onClick={handleClearFilters}
              data-testid="pickup-tenant-landing-clear-filters"
            >
              {t('pickup.landing.clearFilters')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {visibleTenants.length > 0 ? (
        <ul className={ORG_LIST_CLASS} data-testid="pickup-tenant-landing-list">
          {visibleTenants.map((tenant) => (
            <TenantLandingOrgRow
              key={tenant.tenantId}
              tenant={tenant}
              disabled={isNavigating}
              onSelect={goToTenantLogin}
              tileClassName={ORG_TILE_WIDTH_CLASS}
            />
          ))}
        </ul>
      ) : null}

      {isNavigating ? (
        <div
          className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--color-on-surface-muted)]"
          data-testid="pickup-tenant-landing-navigating"
        >
          <Loader2 className="size-4 animate-spin stroke-[1.75]" aria-hidden />
          {t('pickup.landing.submitting')}
        </div>
      ) : null}
    </main>
  );
});

TenantLandingPage.displayName = 'TenantLandingPage';
