import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type HttpProxy, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { buildMonorepoPiKioskSharedAlias } from '../shared/vite/monorepoPiKioskSharedAlias.js';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, '..');
const monorepoShared = buildMonorepoPiKioskSharedAlias(appRoot);

/** GAP-X-03 — gzip main-chunk budget ceiling (KB); enforced by gate:bundle-budget */
const BUNDLE_BUDGET_KB = 1200;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env['VITE_DEV_API_PROXY_TARGET']?.trim() || 'http://localhost:3015';

  const apiProxy: Record<string, ProxyOptions> = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
      configure: (proxy: HttpProxy.Server) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('Accept-Encoding', 'identity');
        });
      },
    },
    '/health': { target: proxyTarget, changeOrigin: true },
  };

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: monorepoShared.alias,
    },
    server: {
      port: 3005,
      host: true,
      ...(monorepoShared.enabled
        ? {
            fs: {
              allow: [repoRoot],
              strict: false,
            },
            watch: { ignored: ['**/node_modules/**', '!**/shared/dist/**'] },
          }
        : {}),
      proxy: apiProxy,
    },
    preview: {
      port: 3005,
      host: true,
      proxy: apiProxy,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: Math.ceil((BUNDLE_BUDGET_KB * 1024) / 4),
    },
    optimizeDeps: monorepoShared.enabled
      ? { exclude: monorepoShared.excludeDeps }
      : undefined,
  };
});
