/**
 * Force the browser HTTP cache to revalidate deploy-critical shell URLs.
 * Cache Storage + SW unregister alone do not evict HTTP disk cache for
 * index.html / sw.js / manifests / runtime-config.
 *
 * Locales are bundled from src/locales (no public/locales HTTP shell) —
 * do not probe /locales/{code}/pickup.json (inert / dead URLs).
 */

export const PICKUP_HTTP_SHELL_BUST_PATHS: readonly string[] = [
  '/',
  '/index.html',
  '/sw.js',
  '/manifest.webmanifest',
  '/manifest-dev.webmanifest',
  '/runtime-config.json',
  '/runtime-config.js',
];

export type BustPickupHttpShellCachesFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function resolveLocationPathname(
  pathnameOverride: string | null | undefined,
): string | null {
  if (pathnameOverride !== undefined) {
    return pathnameOverride;
  }
  try {
    const pathname = globalThis.location?.pathname;
    return typeof pathname === 'string' && pathname.length > 0 ? pathname : null;
  } catch {
    return null;
  }
}

/**
 * Shell bust paths for this navigation: static deploy-critical URLs plus
 * current location.pathname when available (deep SPA document shell).
 */
export function resolvePickupHttpShellBustPaths(
  pathnameOverride?: string | null,
): readonly string[] {
  const paths = new Set<string>(PICKUP_HTTP_SHELL_BUST_PATHS);
  const pathname = resolveLocationPathname(pathnameOverride);
  if (pathname != null && pathname.length > 0) {
    paths.add(pathname);
  }
  return [...paths];
}

/**
 * Best-effort cache:'reload' probes. Failures are ignored — navigation
 * still proceeds (applyUpdate / hard reload).
 *
 * @param pathnameOverride - When undefined, uses globalThis.location.pathname
 *   if available. Pass null to skip pathname (tests). Pass a string to force one.
 */
export async function bustPickupHttpShellCaches(
  fetchImpl: BustPickupHttpShellCachesFetch = fetch,
  pathnameOverride?: string | null,
): Promise<void> {
  const paths = resolvePickupHttpShellBustPaths(pathnameOverride);
  await Promise.all(
    paths.map(async (path) => {
      try {
        await fetchImpl(path, {
          method: 'GET',
          cache: 'reload',
          credentials: 'same-origin',
          headers: {
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
          },
        });
      } catch {
        // Offline / aborted — Update still escalates to hard navigate.
      }
    }),
  );
}
