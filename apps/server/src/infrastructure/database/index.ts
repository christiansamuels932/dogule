import { createDatabaseClient } from './client';
import { loadConfig } from '../config';

const { databaseUrl } = loadConfig();

export const databaseClient = createDatabaseClient(databaseUrl);
