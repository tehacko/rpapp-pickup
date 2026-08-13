/**
 * Pickup PWA install + safe update lifecycle — mount inside authenticated shell.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ANALYTICS_PWA_EVENTS } from 'pi-kiosk-shared/analyticsEvents';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { readViteMetaEnv } from '../../shared/vite/readViteMetaEnv.js';
import { emitPickupPwaAnalytics } from './emitPickupPwaAnalytics.js';
import {
  clearPickupInstallOfferShown,
  isPickupInstallOfferDue,
  markPickupInstallOfferShown,
} from './pickupInstallOfferCooldown.js';
import { isPickupCriticalFlowActive } from './scanActiveGate.js';
import { PwaRefreshBlockingOverlay } from './PwaRefreshBlockingOverlay.js';
import {
  PICKUP_PWA_RELOAD_CHANNEL,
  registerPickupPwaServiceWorker,
} from './registerPickupPwaServiceWorker.js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS/i.test(ua);
}

function readIosGuideEligible(): boolean {
  if (typeof window === 'undefined' || !isIosSafari()) {
    return false;
  }
  return isPickupInstallOfferDue();
}

function readPwaForceUpdateEnabled(): boolean {
  const raw = readViteMetaEnv('VITE_PWA_FORCE_UPDATE');
  return raw === '1' || raw === 'true';
}

export function PickupPwaLifecycle(): JSX.Element | null {
  const { t } = useTranslation('pickup');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installOfferVisible, setInstallOfferVisible] = useState(() =>
    isPickupInstallOfferDue(),
  );
  const [showIosGuide] = useState(() => readIosGuideEligible());
  const [updateReady, setUpdateReady] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const [offline, setOffline] = useState(
    () => (typeof navigator !== 'undefined' ? !navigator.onLine : false),
  );
  const forceUpdateEnabled = readPwaForceUpdateEnabled();
  const updateShownEmittedRef = useRef(false);
  const installOfferMarkedRef = useRef(false);
  const refreshLockRef = useRef(false);
  const criticalFlowActive = isPickupCriticalFlowActive();

  useEffect(() => {
    const onBeforeInstall = (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallOfferVisible(isPickupInstallOfferDue());
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    registerPickupPwaServiceWorker({
      setUpdateReady,
      setApplyUpdate,
    });
  }, []);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(PICKUP_PWA_RELOAD_CHANNEL);
      channel.onmessage = (): void => {
        window.location.reload();
      };
    } catch {
      // BroadcastChannel unavailable
    }
    return () => {
      channel?.close();
    };
  }, []);

  useEffect(() => {
    const onOnline = (): void => {
      setOffline(false);
    };
    const onOffline = (): void => {
      setOffline(true);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!updateReady || updateShownEmittedRef.current) {
      return;
    }
    updateShownEmittedRef.current = true;
    if (isPickupCriticalFlowActive()) {
      emitPickupPwaAnalytics({
        eventName: ANALYTICS_PWA_EVENTS.PWA_UPDATE_DEFERRED,
        metadata: { outcome: 'critical_flow' },
      });
      return;
    }
    emitPickupPwaAnalytics({
      eventName: ANALYTICS_PWA_EVENTS.PWA_UPDATE_SHOWN,
    });
  }, [updateReady]);

  const beginSafeRefresh = (options?: {
    readonly outcome?: string;
    readonly bypassCritical?: boolean;
  }): void => {
    if (refreshLockRef.current || isRefreshing) {
      return;
    }

    const critical = isPickupCriticalFlowActive();
    if (critical && options?.bypassCritical !== true) {
      // Queue for idle — no blocking overlay (reload is deferred).
      emitPickupPwaAnalytics({
        eventName: ANALYTICS_PWA_EVENTS.PWA_UPDATE_APPLIED,
        metadata: { outcome: 'queued_critical' },
      });
      applyUpdate?.();
      return;
    }

    refreshLockRef.current = true;
    setUpdateFailed(false);
    setIsRefreshing(true);
    emitPickupPwaAnalytics({
      eventName: ANALYTICS_PWA_EVENTS.PWA_UPDATE_APPLIED,
      metadata: options?.outcome !== undefined ? { outcome: options.outcome } : undefined,
    });

    try {
      if (applyUpdate !== null) {
        applyUpdate();
        return;
      }
      window.location.reload();
    } catch {
      refreshLockRef.current = false;
      setIsRefreshing(false);
      setUpdateFailed(true);
    }
  };

  const showChromiumInstall = deferredPrompt !== null && installOfferVisible;
  const showIosInstallGuide =
    showIosGuide && deferredPrompt === null && installOfferVisible;

  useEffect(() => {
    if (!showChromiumInstall && !showIosInstallGuide) {
      return;
    }
    if (installOfferMarkedRef.current) {
      return;
    }
    installOfferMarkedRef.current = true;
    markPickupInstallOfferShown();
  }, [showChromiumInstall, showIosInstallGuide]);

  const handleInstall = async (): Promise<void> => {
    if (deferredPrompt === null || isRefreshing) {
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    emitPickupPwaAnalytics({
      eventName:
        choice.outcome === 'accepted'
          ? ANALYTICS_PWA_EVENTS.PWA_INSTALL_ACCEPTED
          : ANALYTICS_PWA_EVENTS.PWA_INSTALL_DISMISSED,
      metadata: { outcome: choice.outcome },
    });
    if (choice.outcome === 'accepted') {
      clearPickupInstallOfferShown();
    }
    setDeferredPrompt(null);
    setInstallOfferVisible(false);
  };

  const handleDismissInstall = (): void => {
    if (isRefreshing) {
      return;
    }
    emitPickupPwaAnalytics({
      eventName: ANALYTICS_PWA_EVENTS.PWA_INSTALL_DISMISSED,
      metadata: { outcome: 'banner_cancel' },
    });
    setDeferredPrompt(null);
    setInstallOfferVisible(false);
  };

  const handleApplyUpdate = (): void => {
    beginSafeRefresh();
  };

  const handleForceRefresh = (): void => {
    beginSafeRefresh({ outcome: 'force_refresh', bypassCritical: true });
  };

  if (
    !showChromiumInstall &&
    !showIosInstallGuide &&
    !updateReady &&
    !offline &&
    !forceUpdateEnabled &&
    !isRefreshing
  ) {
    return null;
  }

  const applyDisabled = isRefreshing || criticalFlowActive;

  return (
    <>
      {isRefreshing ? (
        <PwaRefreshBlockingOverlay label={t('pwa.refreshing')} />
      ) : null}
      <div
        className="fixed inset-x-0 bottom-[var(--pickup-bottom-chrome,0px)] z-[var(--pickup-z-50)] mx-auto max-w-xl px-3"
        data-testid="pickup-pwa-lifecycle"
        aria-hidden={isRefreshing || undefined}
      >
        {offline ? (
          <div className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm">
            <p className="text-sm text-[var(--color-on-surface)]">{t('pwa.offlineBanner')}</p>
          </div>
        ) : null}
        {showChromiumInstall ? (
          <div
            className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm"
            role="region"
            aria-label={t('pwa.installTitle')}
          >
            <h2 className="m-0 text-base font-semibold text-[var(--color-on-surface)]">
              {t('pwa.installTitle')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-muted)]">
              {t('pwa.installPrompt')}
            </p>
            <div className="mt-3 flex flex-col gap-2 min-[30rem]:flex-row min-[30rem]:items-stretch">
              <Button
                type="button"
                intent="primary"
                className="w-full min-[30rem]:min-w-0 min-[30rem]:flex-1"
                onClick={() => void handleInstall()}
                disabled={isRefreshing}
                data-testid="pickup-pwa-install-button"
              >
                {t('pwa.installAction')}
              </Button>
              <Button
                type="button"
                intent="secondary"
                className="w-full min-[30rem]:min-w-0 min-[30rem]:flex-1"
                onClick={handleDismissInstall}
                disabled={isRefreshing}
                data-testid="pickup-pwa-install-dismiss"
              >
                {t('pwa.installDismiss')}
              </Button>
            </div>
          </div>
        ) : null}
        {showIosInstallGuide ? (
          <div
            className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm"
            data-testid="pickup-pwa-ios-guide"
            role="region"
            aria-label={t('pwa.installTitle')}
          >
            <h2 className="m-0 text-base font-semibold text-[var(--color-on-surface)]">
              {t('pwa.installTitle')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-muted)]">
              {t('pwa.iosInstallGuide')}
            </p>
            <Button
              type="button"
              intent="secondary"
              className="mt-3 w-full"
              onClick={handleDismissInstall}
              disabled={isRefreshing}
              data-testid="pickup-pwa-install-dismiss"
            >
              {t('pwa.installDismiss')}
            </Button>
          </div>
        ) : null}
        {updateReady ? (
          <div
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm"
            data-testid="pickup-pwa-update-ready"
          >
            <p className="text-sm text-[var(--color-on-surface)]">
              {criticalFlowActive
                ? t('pwa.updateDeferredCritical')
                : t('pwa.updateReady')}
            </p>
            {updateFailed ? (
              <p className="mt-1 text-xs text-[var(--color-danger,var(--color-error))]" role="alert">
                {t('pwa.updateFailed')}
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-2"
              onClick={handleApplyUpdate}
              disabled={applyDisabled}
              aria-busy={isRefreshing || undefined}
              data-testid="pickup-pwa-apply-update"
            >
              {isRefreshing ? t('pwa.refreshing') : t('pwa.updateAction')}
            </Button>
          </div>
        ) : null}
        {forceUpdateEnabled ? (
          <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm">
            <Button
              type="button"
              className="mt-0"
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              aria-busy={isRefreshing || undefined}
              data-testid="pwa-force-refresh"
            >
              {isRefreshing ? t('pwa.refreshing') : t('pwa.forceRefresh')}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
