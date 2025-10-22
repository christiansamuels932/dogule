export type InitializeVitestEnvOptions = {
  env?: NodeJS.ProcessEnv;
  defaults?: Partial<Record<'NODE_ENV' | 'JWT_SECRET', string>>;
};

const DEFAULT_ENV_VALUES: Record<'NODE_ENV' | 'JWT_SECRET', string> = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret'
};

export function initializeVitestEnv(options: InitializeVitestEnvOptions = {}): void {
  const { env = process.env, defaults } = options;
  const values = { ...DEFAULT_ENV_VALUES, ...defaults };

  for (const [key, value] of Object.entries(values)) {
    const current = env[key];

    if (current === undefined || current.length === 0) {
      env[key as keyof typeof values] = value;
    }
  }
}
