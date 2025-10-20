import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const workspaceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const testingIndex = resolve(workspaceRoot, 'packages/testing/src/index.ts');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@dogule/testing': testingIndex
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8'
    },
    setupFiles: ['./vitest.setup.ts']
  }
});
