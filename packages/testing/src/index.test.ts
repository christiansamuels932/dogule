import { describe, expect, it } from 'vitest';
import { createConsoleSpy, installMiniDom } from './index';

describe('testing utilities', () => {
  it('records console calls', () => {
    const spy = createConsoleSpy();

    console.log('hello');
    console.warn('warn');
    console.error('error');

    expect(spy.logs).toContain('hello');
    expect(spy.warns).toContain('warn');
    expect(spy.errors).toContain('error');

    spy.restore();
  });

  it('installs a minimal DOM', () => {
    installMiniDom();

    const div = document.createElement('div');
    div.textContent = 'Hello';

    expect(div.textContent).toBe('Hello');
  });
});
