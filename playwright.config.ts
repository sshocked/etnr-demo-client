import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'https://lasamb.tw1.ru',
    headless: false,
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: ['--host-resolver-rules=MAP lasamb.tw1.ru 85.239.53.73'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
