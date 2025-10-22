import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

import { getCiFlags } from '@dogule/utils';

const rootDir = path.resolve(__dirname, '..');
const { forbidOnly, retries, reuseExistingServer } = getCiFlags();

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly,
  retries,
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
    reuseExistingServer,
  },
});
