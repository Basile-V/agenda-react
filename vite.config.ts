import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // Deterministic dates, and a zone with daylight saving time to exercise it.
    // .env is not versioned: tests must not depend on the developer's machine.
    env: { TZ: 'Europe/Paris', VITE_API_BASE_URL: 'http://api.test' },
  },
});
