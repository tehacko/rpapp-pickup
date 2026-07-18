import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type HttpProxy, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildMonorepoPiKioskSharedAlias } from '../shared/vite/monorepoPiKioskSharedAlias.js';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, '..');
const monorepoShared = buildMonorepoPiKioskSharedAlias(appRoot);

/** GAP-X-03 — gzip main-chunk budget ceiling (KB); enforced by gate:bundle-budget */
const BUNDLE_BUDGET_KB = 1600;

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

  const pwaPlugins = VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    manifest: {
      name: 'RPApp Pickup',
      short_name: 'Pickup',
      description: 'Staff fulfillment and sales',
      start_url: '/',
      scope: '/',
      id: 'rpapp-pickup-pwa',
      display: 'standalone',
      background_color: '#f8fafc',
      theme_color: '#00203F',
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'pwa-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Hub',
          short_name: 'Hub',
          url: '/?shortcut=hub',
          icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
        },
        {
          name: 'Scan',
          short_name: 'Scan',
          url: '/?shortcut=scan',
          icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
        },
        {
          name: 'Queue',
          short_name: 'Queue',
          url: '/?shortcut=queue',
          icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      globIgnores: ['**/runtime-config.json'],
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api\//, /^\/events\//, /^\/health/],
      cleanupOutdatedCaches: true,
      runtimeCaching: [],
      skipWaiting: false,
      clientsClaim: true,
    },
    devOptions: { enabled: false },
  });

  return {
    plugins: [react(), tailwindcss(), ...pwaPlugins],
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
