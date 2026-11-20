/**
 * Full-viewport interaction lock while a PWA safe refresh is in flight,
 * or while an update is required (hard gate — app stays inert until Update).
 * Portaled to document.body so #root can be inert without hiding this UI.
 *
 * G3: Radix ConfirmDialog / AlertDialog / PickupMoreDrawer portals mount on
 * document.body outside #root — freeze must inert every body child except
 * this overlay so portal chrome cannot receive pointer/keyboard while locked.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../shared/ui/surfacePrimitives.js';

/** Marks the blocking overlay root so body-child inert skips it. */
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

type BodyChildLock = {
  readonly element: Element;
  readonly hadInert: boolean;
  readonly previousAriaHidden: string | null;
};

function isBlockingOverlayRoot(element: Element): boolean {
  return element.hasAttribute(PICKUP_PWA_BLOCKING_OVERLAY_ATTR);
}

function lockBodyChild(element: Element, locks: BodyChildLock[]): void {
  if (isBlockingOverlayRoot(element)) {
    return;
  }
  if (locks.some((lock) => lock.element === element)) {
    return;
  }
  locks.push({
    element,
    hadInert: element.hasAttribute('inert'),
    previousAriaHidden: element.getAttribute('aria-hidden'),
  });
  element.setAttribute('inert', '');
  element.setAttribute('aria-hidden', 'true');
}

function unlockBodyChildren(locks: readonly BodyChildLock[]): void {
  for (const lock of locks) {
    if (!lock.hadInert) {
      lock.element.removeAttribute('inert');
    }
    if (lock.previousAriaHidden === null) {
      lock.element.removeAttribute('aria-hidden');
    } else {
      lock.element.setAttribute('aria-hidden', lock.previousAriaHidden);
    }
  }
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
  const allowOverlayKeys = showUpdateAction;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const locks: BodyChildLock[] = [];
    for (const child of Array.from(document.body.children)) {
      lockBodyChild(child, locks);
    }

    // Late Radix/body portals (ConfirmDialog, drawers) added while freeze is active.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) {
            lockBodyChild(node, locks);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true });

    const blockKeys = (event: KeyboardEvent): void => {
      if (allowOverlayKeys) {
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
      observer.disconnect();
      unlockBodyChildren(locks);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [allowOverlayKeys]);

  if (typeof document === 'undefined') {
    return null;
  }

  const labelledById = showUpdateAction
    ? 'pickup-pwa-update-required-title'
    : 'pickup-pwa-refresh-label';

  return createPortal(
    <div
      // Above ConfirmDialog/AlertDialog (z-80) and ToastViewport (z-90).
      className="fixed inset-0 z-[calc(var(--pickup-z-90)+10)] flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
      role="alertdialog"
      aria-modal="true"
      aria-busy={allowOverlayKeys ? undefined : true}
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
