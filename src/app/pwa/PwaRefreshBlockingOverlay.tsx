/**
 * Full-viewport interaction lock while a PWA safe refresh is in flight.
 * Portaled to document.body so #root can be inert without hiding this UI.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface PwaRefreshBlockingOverlayProps {
  readonly label: string;
  readonly testId?: string;
}

export function PwaRefreshBlockingOverlay({
  label,
  testId = 'pickup-pwa-refresh-blocking',
}: PwaRefreshBlockingOverlayProps): JSX.Element | null {
  useEffect(() => {
    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'hidden';

    const blockKeys = (event: KeyboardEvent): void => {
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
  }, []);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--pickup-z-90)] flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="pickup-pwa-refresh-label"
      data-testid={testId}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <p
        id="pickup-pwa-refresh-label"
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-on-surface)] shadow-sm"
      >
        {label}
      </p>
    </div>,
    document.body,
  );
}
