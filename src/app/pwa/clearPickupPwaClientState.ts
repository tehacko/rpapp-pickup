/**
 * Pickup PWA client-state cleanup — caches + SW unregister (logout ON).
 */

async function clearAllCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Best-effort
  }
}

async function unregisterAllServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Best-effort
  }
}

export async function clearPickupPwaClientState(): Promise<void> {
  await Promise.all([clearAllCaches(), unregisterAllServiceWorkers()]);
}
