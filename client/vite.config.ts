import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const API = process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
      '/socket.io': { target: API, ws: true },
    },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 700 },
  test: { environment: 'jsdom', globals: false },
});
