import { defineConfig, devices } from '@playwright/test';

// End to end tests. They run against the Firebase emulators and a local build of the app made with the `e2e`
// configuration (npm run e2e starts everything).
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/support/global-setup.ts',
  // The emulators and their data are shared: one test at a time keeps them predictable
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'npx ng serve --configuration e2e --port 4300 --host 127.0.0.1',
    url: 'http://127.0.0.1:4300',
    timeout: 240_000,
    reuseExistingServer: !process.env['CI'],
  },
});
