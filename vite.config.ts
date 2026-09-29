import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // Deterministic dates, and a zone with daylight saving time to exercise it.
    env: { TZ: 'Europe/Paris' },
  },
});
