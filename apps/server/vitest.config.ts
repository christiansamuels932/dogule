import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

process.env.DATABASE_URL ??= 'pg-mem://dogule-test';

if (typeof process.stdout?.columns !== 'number' || !Number.isFinite(process.stdout.columns) || process.stdout.columns <= 0) {
  process.stdout.columns = 80;
}

const workspaceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const testingIndex = resolve(workspaceRoot, 'packages/testing/src/index.ts');
const utilsIndex = resolve(workspaceRoot, 'packages/utils/src/index.ts');
const domainIndex = resolve(workspaceRoot, 'packages/domain/src/index.ts');
const rateLimitIndex = resolve(workspaceRoot, 'packages/express-rate-limit/src/index.js');

export default defineConfig({
  resolve: {
    alias: {
      '@dogule/testing': testingIndex,
      '@dogule/utils': utilsIndex,
      '@dogule/domain': domainIndex,
      'express-rate-limit': rateLimitIndex,
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8'
    }
  }
});
