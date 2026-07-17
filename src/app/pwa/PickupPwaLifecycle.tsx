/**
 * Pickup PWA install + safe update lifecycle — mount inside authenticated shell.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ANALYTICS_PWA_EVENTS } from 'pi-kiosk-shared/analyticsEvents';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { emitPickupPwaAnalytics } from './emitPickupPwaAnalytics.js';
import { isPickupCriticalFlowActive } from './scanActiveGate.js';
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
  const visits = Number(window.sessionStorage.getItem('pickup-pwa-visits') ?? '0') + 1;
  window.sessionStorage.setItem('pickup-pwa-visits', String(visits));
  return visits >= 2;
}

function readPwaForceUpdateEnabled(): boolean {
  const raw = import.meta.env.VITE_PWA_FORCE_UPDATE;
  return raw === '1' || raw === 'true';
}

export function PickupPwaLifecycle(): JSX.Element | null {
  const { t } = useTranslation('pickup');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosGuide] = useState(() => readIosGuideEligible());
  const [updateReady, setUpdateReady] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  const [offline, setOffline] = useState(
    () => (typeof navigator !== 'undefined' ? !navigator.onLine : false),
  );
  const forceUpdateEnabled = readPwaForceUpdateEnabled();
  const updateShownEmittedRef = useRef(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
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

  const handleInstall = async (): Promise<void> => {
    if (deferredPrompt === null) {
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
    setDeferredPrompt(null);
  };

  const handleApplyUpdate = (): void => {
    emitPickupPwaAnalytics({
      eventName: ANALYTICS_PWA_EVENTS.PWA_UPDATE_APPLIED,
    });
    if (applyUpdate !== null) {
      applyUpdate();
    }
  };

  const handleForceRefresh = (): void => {
    emitPickupPwaAnalytics({
      eventName: ANALYTICS_PWA_EVENTS.PWA_UPDATE_APPLIED,
      metadata: { outcome: 'force_refresh' },
    });
    if (applyUpdate !== null) {
      applyUpdate();
      return;
    }
    window.location.reload();
  };

  if (!deferredPrompt && !showIosGuide && !updateReady && !offline && !forceUpdateEnabled) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-[var(--pickup-bottom-chrome,0px)] z-[var(--pickup-z-50)] mx-auto max-w-xl px-3"
      data-testid="pickup-pwa-lifecycle"
    >
      {offline ? (
        <div className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm">
          <p className="text-sm text-[var(--color-on-surface)]">{t('pwa.offlineBanner')}</p>
        </div>
      ) : null}
      {deferredPrompt !== null ? (
        <div className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm">
          <p className="text-sm text-[var(--color-on-surface)]">{t('pwa.installPrompt')}</p>
          <Button
            type="button"
            className="mt-2"
            onClick={() => void handleInstall()}
            data-testid="pickup-pwa-install-button"
          >
            {t('pwa.installAction')}
          </Button>
        </div>
      ) : null}
      {showIosGuide && deferredPrompt === null ? (
        <div
          className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm"
          data-testid="pickup-pwa-ios-guide"
        >
          <p className="text-sm text-[var(--color-on-surface)]">{t('pwa.iosInstallGuide')}</p>
        </div>
      ) : null}
      {updateReady ? (
        <div
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm"
          data-testid="pickup-pwa-update-ready"
        >
          <p className="text-sm text-[var(--color-on-surface)]">
            {isPickupCriticalFlowActive()
              ? t('pwa.updateDeferredCritical')
              : t('pwa.updateReady')}
          </p>
          <Button
            type="button"
            className="mt-2"
            onClick={handleApplyUpdate}
            data-testid="pickup-pwa-apply-update"
          >
            {t('pwa.updateAction')}
          </Button>
        </div>
      ) : null}
      {forceUpdateEnabled ? (
        <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-sm">
          <Button
            type="button"
            className="mt-0"
            onClick={handleForceRefresh}
            data-testid="pwa-force-refresh"
          >
            {t('pwa.forceRefresh')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
