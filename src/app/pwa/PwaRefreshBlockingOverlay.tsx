/**
 * Full-viewport interaction lock while a PWA safe refresh is in flight,
 * or while an update is required (hard gate — app stays inert until Update).
 * Portaled to document.body so #root can be inert without hiding this UI.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../shared/ui/surfacePrimitives.js';

export const PICKUP_PWA_BLOCKING_OVERLAY_ATTR = 'data-pickup-pwa-blocking-overlay';

export interface PwaRefreshBlockingOverlayProps {
  readonly label: string;
  readonly testId?: string;
  readonly title?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly actionDisabled?: boolean;
  readonly actionLoading?: boolean;
  readonly actionTestId?: string;
  readonly deferredHint?: string;
}

export function PwaRefreshBlockingOverlay({
  label,
  testId = 'pickup-pwa-refresh-blocking',
  title,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionLoading = false,
  actionTestId = 'pickup-pwa-apply-update',
  deferredHint,
}: PwaRefreshBlockingOverlayProps): JSX.Element | null {
  const showUpdateAction =
    actionLabel !== undefined && onAction !== undefined;

  useEffect(() => {
    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'hidden';

    const blockKeys = (event: KeyboardEvent): void => {
      if (showUpdateAction) {
        const overlayRoot = document.querySelector(
          `[${PICKUP_PWA_BLOCKING_OVERLAY_ATTR}]`,
        );
        if (
          overlayRoot !== null &&
          event.target instanceof Node &&
          overlayRoot.contains(event.target)
        ) {
          return;
        }
        if (event.key === 'Tab') {
          return;
        }
      }
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-hidden');
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [showUpdateAction]);

  if (typeof document === 'undefined') {
    return null;
  }

  const labelledById = showUpdateAction
    ? 'pickup-pwa-update-required-title'
    : 'pickup-pwa-refresh-label';

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--pickup-z-90)] flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
      role="alertdialog"
      aria-modal="true"
      aria-busy={showUpdateAction ? undefined : true}
      aria-labelledby={labelledById}
      data-testid={testId}
      data-pickup-pwa-blocking-overlay=""
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div className="max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 shadow-sm">
        {showUpdateAction && title !== undefined ? (
          <h2
            id="pickup-pwa-update-required-title"
            className="m-0 text-base font-semibold text-[var(--color-on-surface)]"
          >
            {title}
          </h2>
        ) : null}
        <p
          id={
            showUpdateAction
              ? 'pickup-pwa-update-required-body'
              : 'pickup-pwa-refresh-label'
          }
          className={
            showUpdateAction && title !== undefined
              ? 'mt-1 text-sm text-[var(--color-on-surface-muted)]'
              : 'text-sm text-[var(--color-on-surface)]'
          }
        >
          {label}
        </p>
        {deferredHint !== undefined ? (
          <p className="mt-2 text-xs text-[var(--color-on-surface-muted)]">
            {deferredHint}
          </p>
        ) : null}
        {showUpdateAction ? (
          <div className="mt-3">
            <Button
              type="button"
              intent="primary"
              className="w-full"
              onClick={onAction}
              disabled={actionDisabled}
              aria-busy={actionLoading || undefined}
              aria-disabled={actionDisabled || undefined}
              data-testid={actionTestId}
            >
              {actionLoading ? label : actionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
