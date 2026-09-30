import { defineConfig, devices } from '@playwright/test';

// Its own port: never mistaken for a `npm run dev` already running against the real backend.
const PORT = 5174;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  // French browser: the app follows the browser's language until the user picks one.
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry', locale: 'fr-FR' },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  // The real app in a real browser, on the MSW mock backend: no server to start or seed.
  webServer: {
    command: `npm run dev:mock -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
  },
});
