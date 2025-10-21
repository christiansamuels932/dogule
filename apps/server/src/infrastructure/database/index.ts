import { createDatabaseClient, DatabaseClient } from './client';
import { loadConfig } from '../config';

let client: DatabaseClient | undefined;

export const getDatabaseClient = (): DatabaseClient => {
  if (!client) {
    const shouldFallbackToMemory =
      (process.env.NODE_ENV === 'test' || process.env.VITEST_WORKER_ID) &&
      !process.env.DATABASE_URL;

    if (shouldFallbackToMemory) {
      client = createDatabaseClient('pg-mem://runtime-fallback');
    } else {
      const { databaseUrl } = loadConfig();
      client = createDatabaseClient(databaseUrl);
    }
  }

  return client;
};
