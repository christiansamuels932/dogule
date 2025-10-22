type LogLevel = 'info' | 'warn' | 'error';

const createLogger = (level: LogLevel) => {
  return (code: string, ...details: unknown[]) => {
    const method = console[level].bind(console);

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
