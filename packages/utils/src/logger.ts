export const logInfo = (...args: unknown[]) => {
  console.info('[INFO]', ...args);
};

export const logWarn = (...args: unknown[]) => {
  console.warn('[WARN]', ...args);
};

export const logError = (...args: unknown[]) => {
  console.error('[ERROR]', ...args);
};
