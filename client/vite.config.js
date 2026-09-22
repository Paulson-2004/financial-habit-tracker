import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Read the repository-root .env instead of duplicating one in client/.
  // Only variables prefixed VITE_ are exposed to client code (see .env.example).
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
    // Lets the dev server call the API with relative /api/... paths, same as production.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: true,
  },
});
