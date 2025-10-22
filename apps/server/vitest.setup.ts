if (typeof process.stdout?.columns !== 'number' || !Number.isFinite(process.stdout.columns) || process.stdout.columns <= 0) {
  process.stdout.columns = 80;
}

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';
process.env.DATABASE_URL ??= 'pg-mem://vitest';
