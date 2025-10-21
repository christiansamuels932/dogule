import { config as loadEnv } from 'dotenv';

import { logError } from '@dogule/utils';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
}

let envLoaded = false;

const ensureEnv = () => {
  if (!envLoaded) {
    loadEnv();
    envLoaded = true;
  }
};

export const loadConfig = (): AppConfig => {
  ensureEnv();

  const port = Number(process.env.PORT ?? 4000);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!databaseUrl) {
    logError('ERR_DB_ENV_001 Missing DATABASE_URL environment variable');
    process.exit(1);
  }

  if (!jwtSecret) {
    logError('ERR_AUTH_ENV_001 Missing JWT_SECRET environment variable');
    process.exit(1);
  }

  return {
    port,
    nodeEnv,
    databaseUrl,
    jwtSecret,
  };
};
