import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    cwd: rootDir,
    timeout: 120 * 1000,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
