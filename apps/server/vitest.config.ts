import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

process.env.DATABASE_URL ??= 'postgresql://dogule:dogule@localhost:5432/dogule-test';

const workspaceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const testingIndex = resolve(workspaceRoot, 'packages/testing/src/index.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@dogule/testing': testingIndex
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8'
    }
  }
});
