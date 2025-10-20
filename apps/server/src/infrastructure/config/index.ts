export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl?: string;
}

export const loadConfig = (): AppConfig => ({
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
});
