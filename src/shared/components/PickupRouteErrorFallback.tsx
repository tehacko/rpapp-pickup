import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/surfacePrimitives.js';

type Props = {
  onRetry: () => void;
  feature: string;
  testId: string;
};

/**
 * Nested L2/L3 route error UI — must use `<div>` (root PickupErrorBoundary owns `<main>`).
 * Nav-reset: pathname change while mounted → onRetry (RemountBoundary remounts via key).
 * Focus: moves to the alert on mount (a11y), matching customer RouteErrorFallback.
 */
export function PickupRouteErrorFallback({ onRetry, feature, testId }: Props): JSX.Element {
  const { t } = useTranslation('pickup');
  const { pathname } = useLocation();
  const mountPathRef = useRef(pathname);
  const alertRef = useRef<HTMLDivElement>(null);

  // While this fallback is mounted, a pathname change = user left the broken route → remount via onRetry.
  // Healthy trees never remount: this effect only runs while fallback UI is on screen.
  useEffect(() => {
    if (pathname === mountPathRef.current) {
      return;
    }
    onRetry();
  }, [pathname, onRetry]);

  useEffect(() => {
    alertRef.current?.focus();
  }, []);

  return (
    <div
      ref={alertRef}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      data-testid={testId}
      data-feature={feature}
      className="flex w-full flex-col items-center justify-center gap-3 px-4 py-8 text-center outline-none"
    >
      <h2 className="m-0 text-lg font-bold tracking-tight text-[var(--color-on-surface)]">
        {t('pickup.routeError.title')}
      </h2>
      <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
        {t('pickup.routeError.message')}
      </p>
      <Button type="button" onClick={() => onRetry()} className="mt-1">
        {t('pickup.routeError.retry')}
      </Button>
    </div>
  );
}
