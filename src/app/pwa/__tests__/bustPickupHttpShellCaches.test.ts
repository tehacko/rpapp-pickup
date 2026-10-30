import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  PICKUP_HTTP_SHELL_BUST_PATHS,
  bustPickupHttpShellCaches,
  resolvePickupHttpShellBustPaths,
} from '../bustPickupHttpShellCaches.js';

const publicLocalesDir = resolve(process.cwd(), 'public/locales');

describe('bustPickupHttpShellCaches', () => {
  it('reloads every shell path with cache: reload', async () => {
    const fetchImpl = jest.fn(async () => new Response(null, { status: 200 }));
    // null → skip location.pathname so call count matches the static list
    await bustPickupHttpShellCaches(fetchImpl, null);

    expect(fetchImpl).toHaveBeenCalledTimes(PICKUP_HTTP_SHELL_BUST_PATHS.length);
    for (const path of PICKUP_HTTP_SHELL_BUST_PATHS) {
      expect(fetchImpl).toHaveBeenCalledWith(
        path,
        expect.objectContaining({
          method: 'GET',
          cache: 'reload',
          credentials: 'same-origin',
        }),
      );
    }
  });

  it('also reloads location.pathname when available', async () => {
    const fetchImpl = jest.fn(async () => new Response(null, { status: 200 }));
    const deepPath = '/railway-cafe/queue';

    await bustPickupHttpShellCaches(fetchImpl, deepPath);

    expect(fetchImpl).toHaveBeenCalledWith(
      deepPath,
      expect.objectContaining({
        method: 'GET',
        cache: 'reload',
        credentials: 'same-origin',
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith('/', expect.objectContaining({ cache: 'reload' }));
    expect(fetchImpl).toHaveBeenCalledWith(
      '/index.html',
      expect.objectContaining({ cache: 'reload' }),
    );
    expect(resolvePickupHttpShellBustPaths(deepPath)).toEqual(
      expect.arrayContaining([deepPath, '/', '/index.html']),
    );
  });

  it('does not probe bundled-only locale HTTP paths (no public/locales shell)', () => {
    expect(existsSync(publicLocalesDir)).toBe(false);
    for (const path of PICKUP_HTTP_SHELL_BUST_PATHS) {
      expect(path.startsWith('/locales/')).toBe(false);
    }
    expect(resolvePickupHttpShellBustPaths(null)).toEqual([
      ...PICKUP_HTTP_SHELL_BUST_PATHS,
    ]);
  });

  it('does not include hashed asset paths', () => {
    for (const path of PICKUP_HTTP_SHELL_BUST_PATHS) {
      expect(path.startsWith('/assets/')).toBe(false);
    }
  });

  it('swallows fetch failures so update can still navigate', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('offline');
    });

    await expect(bustPickupHttpShellCaches(fetchImpl, null)).resolves.toBeUndefined();
  });
});
