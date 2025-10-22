import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

import { getCiFlags } from '@dogule/utils';

const repoRoot = path.resolve(__dirname, '../..');
const webRoot = path.resolve(__dirname, '..');
const serverRoot = path.resolve(repoRoot, 'apps/server');

const { forbidOnly, retries, reuseExistingServer } = getCiFlags();

const apiPort = Number(process.env.PREALPHA_API_PORT ?? 4000);
const webPort = Number(process.env.PREALPHA_WEB_PORT ?? 4173);
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

const seedEmail = process.env.PREALPHA_SEED_EMAIL ?? 'prealpha.admin@example.com';
const seedPassword = process.env.PREALPHA_SEED_PASSWORD ?? 'prealpha-admin';
const seedRole = process.env.PREALPHA_SEED_ROLE ?? 'admin';

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  testMatch: /prealpha\.smoke\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly,
  retries,
  reporter: 'html',
  use: {
    baseURL: webBaseUrl,
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: serverRoot,
      env: {
        NODE_ENV: 'development',
        PORT: String(apiPort),
        DATABASE_URL: process.env.PREALPHA_DATABASE_URL ?? 'pg-mem://prealpha-smoke',
        JWT_SECRET: process.env.PREALPHA_JWT_SECRET ?? 'prealpha-secret',
        PREALPHA_SEED: '1',
        PREALPHA_SEED_EMAIL: seedEmail,
        PREALPHA_SEED_PASSWORD: seedPassword,
        PREALPHA_SEED_ROLE: seedRole,
      },
      reuseExistingServer,
      timeout: 120 * 1000,
      url: `${apiOrigin}/ready`,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort}`,
      cwd: webRoot,
      env: {
        VITE_API_PROXY_TARGET: apiOrigin,
      },
      reuseExistingServer,
      timeout: 120 * 1000,
      url: webBaseUrl,
    },
  ],
});
