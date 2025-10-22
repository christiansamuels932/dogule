import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/dashboard': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/graphql': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
