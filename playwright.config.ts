import { defineConfig } from '@playwright/test';

const chromeChannel = process.env.PW_CHANNEL as 'chrome' | 'msedge' | undefined;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: chromeChannel ? { browserName: 'chromium', channel: chromeChannel } : { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
