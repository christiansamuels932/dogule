import { createDatabaseClient, DatabaseClient } from './client';
import { loadConfig } from '../config';

let client: DatabaseClient | undefined;

export const getDatabaseClient = (): DatabaseClient => {
  if (!client) {
    const { databaseUrl } = loadConfig();
    client = createDatabaseClient(databaseUrl);
  }

  return client;
};
