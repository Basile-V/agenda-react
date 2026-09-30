import react from '@vitejs/plugin-react';
import { rm } from 'node:fs/promises';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    {
      // MSW's service worker has to sit in public/ for `npm run dev:mock`, and Vite copies
      // public/ into every build: keep it out of the ones that do not mock the API.
      name: 'drop-msw-worker',
      apply: (_, { command, mode }) => command === 'build' && mode !== 'mock',
      closeBundle: () => rm('dist/mockServiceWorker.js', { force: true }),
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // Deterministic dates, and a zone with daylight saving time to exercise it.
    // .env is not versioned: tests must not depend on the developer's machine.
    env: { TZ: 'Europe/Paris', VITE_API_BASE_URL: 'http://api.test' },
  },
});
