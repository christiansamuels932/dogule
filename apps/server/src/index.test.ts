import { describe, expect, it } from 'vitest';

import { createGreeting, logGreeting } from './index';

describe('createGreeting', () => {
  it('returns a friendly message', () => {
    expect(createGreeting('Trainer')).toBe('Hello, Trainer!');
  });
});

describe('logGreeting', () => {
  it('logs the greeting to the console', () => {
    const { logs } = logGreeting('Pack');
    expect(logs).toContain('Hello, Pack!');
  });
});
