import { defineConfig, loadEnv, type HttpProxy, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

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
    server: {
      port: 3005,
      host: true,
      proxy: apiProxy,
    },
    preview: {
      port: 3005,
      host: true,
      proxy: apiProxy,
    },
  };
});
