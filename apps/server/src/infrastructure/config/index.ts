import { ErrorCode } from '@dogule/domain';
import { logError, loadServerEnvConfig, type ServerEnvConfig } from '@dogule/utils';

export type AppConfig = ServerEnvConfig;

export const loadConfig = (): AppConfig => {
  const config = loadServerEnvConfig();

  if (!config.databaseUrl) {
    logError(ErrorCode.ERR_DB_ENV_001, 'Missing DATABASE_URL environment variable');
    process.exit(1);
  }

  if (!config.jwtSecret) {
    logError(ErrorCode.ERR_AUTH_ENV_001, 'Missing JWT_SECRET environment variable');
    process.exit(1);
  }

  return config;
};
