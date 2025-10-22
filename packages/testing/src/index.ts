export type ConsoleSpy = {
  logs: string[];
  warns: string[];
  errors: string[];
  restore: () => void;
};

export { installMiniDom } from './test-dom';

export const createConsoleSpy = (): ConsoleSpy => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
    originalLog(...args);
  };

  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(' '));
    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
    originalError(...args);
  };

  return {
    logs,
    warns,
    errors,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }
  };
};
