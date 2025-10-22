import { initializeVitestEnv } from '../vitest.env';

if (typeof process.stdout?.columns !== 'number' || !Number.isFinite(process.stdout.columns) || process.stdout.columns <= 0) {
  process.stdout.columns = 80;
}

initializeVitestEnv();

process.env.DATABASE_URL ??= 'pg-mem://vitest';
