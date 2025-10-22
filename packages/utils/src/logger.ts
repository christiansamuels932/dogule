type LogLevel = 'info' | 'warn' | 'error';

const createLogger = (level: LogLevel) => {
  const method = console[level].bind(console);

  return (code: string, ...details: unknown[]) => {
    if (!code) {
      method(`[${level.toUpperCase()}]`, ...details);
      return;
    }

    method(code, ...details);
  };
};

export const logInfo = createLogger('info');
export const logWarn = createLogger('warn');
export const logError = createLogger('error');
