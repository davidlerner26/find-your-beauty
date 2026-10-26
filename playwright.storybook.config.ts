import { defineConfig, devices } from '@playwright/test';

// Opens every story of the built Storybook (npm run build-storybook) and checks that it renders and is accessible
export default defineConfig({
  testDir: 'storybook-tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:6007', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'node scripts/serve-static.cjs storybook-static 6007',
    url: 'http://127.0.0.1:6007/index.json',
    reuseExistingServer: !process.env['CI'],
  },
});
