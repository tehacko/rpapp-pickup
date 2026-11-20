/**
 * @jest-environment jsdom
 *
 * G3 - body-portal inert lock: Radix ConfirmDialog / PickupMoreDrawer /
 * AlertDialog mount on document.body outside #root; freeze must inert those
 * siblings while the overlay (and Update CTA under update-required) stay interactive.
 */
import { createPortal } from 'react-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  PICKUP_PWA_BLOCKING_OVERLAY_ATTR,
  PwaRefreshBlockingOverlay,
} from '../PwaRefreshBlockingOverlay.js';

function ensureRoot(): HTMLElement {
  let root = document.getElementById('root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  }
  return root;
}

function BodyPortaledChrome({
  onActivate,
}: {
  readonly onActivate: () => void;
}): JSX.Element {
  return createPortal(
    <div data-testid="confirm-portal-host">
      <button
        type="button"
        data-testid="confirm-portal-button"
        onClick={onActivate}
      >
        Confirm action
      </button>
    </div>,
    document.body,
  );
}

async function flushMutationObserver(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('PwaRefreshBlockingOverlay (G3 portal inert)', () => {
  let root: HTMLElement;
  let portalHosts: HTMLElement[];

  beforeEach(() => {
    root = ensureRoot();
    root.removeAttribute('inert');
    root.removeAttribute('aria-hidden');
    root.innerHTML = '';
    const inRoot = document.createElement('button');
    inRoot.type = 'button';
    inRoot.setAttribute('data-testid', 'in-root-button');
    inRoot.textContent = 'In root';
    root.appendChild(inRoot);
    portalHosts = [];
  });

  afterEach(() => {
    for (const host of portalHosts) {
      host.remove();
    }
    root.removeAttribute('inert');
    root.removeAttribute('aria-hidden');
  });

  it('inerts #root and body-portaled chrome siblings under update-required; overlay stays interactive', async () => {
    const onAction = jest.fn();

    render(
      <>
        <BodyPortaledChrome onActivate={jest.fn()} />
        <PwaRefreshBlockingOverlay
          label="A new version is available."
          title="Update required"
          actionLabel="Update"
          onAction={onAction}
        />
      </>,
    );

    await flushMutationObserver();

    const overlay = screen.getByTestId('pickup-pwa-refresh-blocking');
    const portalHost = screen.getByTestId('confirm-portal-host');
    const portalButton = screen.getByTestId('confirm-portal-button');

    expect(overlay.hasAttribute(PICKUP_PWA_BLOCKING_OVERLAY_ATTR)).toBe(true);
    expect(overlay.hasAttribute('inert')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).not.toBe('true');

    expect(root.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('true');

    expect(portalHost.hasAttribute('inert')).toBe(true);
    expect(portalHost.getAttribute('aria-hidden')).toBe('true');
    expect(portalButton.closest('[inert]')).toBe(portalHost);

    fireEvent.click(screen.getByTestId('pickup-pwa-apply-update'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('inerts late body portals added while freeze is active (MutationObserver)', async () => {
    render(
      <PwaRefreshBlockingOverlay
        label="A new version is available."
        title="Update required"
        actionLabel="Update"
        onAction={jest.fn()}
      />,
    );
    await flushMutationObserver();

    const latePortal = document.createElement('div');
    latePortal.setAttribute('data-testid', 'late-radix-portal');
    const lateButton = document.createElement('button');
    lateButton.type = 'button';
    lateButton.setAttribute('data-testid', 'late-portal-button');
    latePortal.appendChild(lateButton);
    portalHosts.push(latePortal);

    act(() => {
      document.body.appendChild(latePortal);
    });
    await flushMutationObserver();

    expect(latePortal.hasAttribute('inert')).toBe(true);
    expect(latePortal.getAttribute('aria-hidden')).toBe('true');
    expect(lateButton.closest('[inert]')).toBe(latePortal);
    expect(
      screen.getByTestId('pickup-pwa-refresh-blocking').hasAttribute('inert'),
    ).toBe(false);
  });

  it('restores prior inert / aria-hidden on unmount', async () => {
    root.setAttribute('inert', '');
    root.setAttribute('aria-hidden', 'false');

    const portalHost = document.createElement('div');
    portalHost.setAttribute('data-testid', 'preexisting-portal');
    document.body.appendChild(portalHost);
    portalHosts.push(portalHost);

    const { unmount } = render(
      <PwaRefreshBlockingOverlay
        label="A new version is available."
        title="Update required"
        actionLabel="Update"
        onAction={jest.fn()}
      />,
    );
    await flushMutationObserver();

    expect(root.hasAttribute('inert')).toBe(true);
    expect(portalHost.hasAttribute('inert')).toBe(true);
    expect(portalHost.getAttribute('aria-hidden')).toBe('true');

    unmount();

    expect(root.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(portalHost.hasAttribute('inert')).toBe(false);
    expect(portalHost.hasAttribute('aria-hidden')).toBe(false);
  });

  it('allows Tab and overlay-targeted keys under update-required; blocks other keys', async () => {
    render(
      <PwaRefreshBlockingOverlay
        label="A new version is available."
        title="Update required"
        actionLabel="Update"
        onAction={jest.fn()}
      />,
    );
    await flushMutationObserver();

    const updateButton = screen.getByTestId('pickup-pwa-apply-update');

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    expect(window.dispatchEvent(tabEvent)).toBe(true);

    const enterOnOverlay = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(enterOnOverlay, 'target', {
      value: updateButton,
      configurable: true,
    });
    expect(window.dispatchEvent(enterOnOverlay)).toBe(true);

    const escapeAtRoot = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(escapeAtRoot, 'target', {
      value: root,
      configurable: true,
    });
    expect(window.dispatchEvent(escapeAtRoot)).toBe(false);
  });
});
