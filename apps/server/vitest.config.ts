import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const workspaceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const testingIndex = resolve(workspaceRoot, 'packages/testing/src/index.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@dogule/testing': testingIndex
    }
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8'
    }
  }
});
