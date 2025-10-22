import { describe, expect, it } from 'vitest';
import { ErrorCode, LogCode } from './error-codes';

describe('domain codes', () => {
  it('contains stable error codes', () => {
    expect(ErrorCode.ERR_AUTH_401).toBe('ERR_AUTH_401');
  });

  it('contains stable log codes', () => {
    expect(LogCode.LOG_DB_READY_001).toBe('LOG_DB_READY_001');
  });
});
