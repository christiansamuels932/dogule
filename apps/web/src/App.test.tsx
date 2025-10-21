import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('shows the login form by default', () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores a session from local storage', async () => {
    localStorage.setItem('dogule_token', 'token-123');

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (input === '/auth/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            user: {
              sub: 'user-1',
              email: 'restored@example.com',
              role: 'admin',
              name: 'Restored User',
            },
          }),
        });
      }

      if (input === '/dashboard') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            kundenCount: 4,
            hundeCount: 2,
            kurseCount: 3,
            finanzenCount: 1,
            kalenderCount: 5,
            kommunikationCount: 6,
          }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${input}`));
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument(),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/dashboard',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      }),
    );
    expect(screen.getByText('Restored User')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('clears the session when restore fails', async () => {
    localStorage.setItem('dogule_token', 'token-456');

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (input === '/auth/me') {
        return Promise.resolve({ ok: false });
      }

      if (input === '/dashboard') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            kundenCount: 0,
            hundeCount: 0,
            kurseCount: 0,
            finanzenCount: 0,
            kalenderCount: 0,
            kommunikationCount: 0,
          }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${input}`));
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => expect(screen.getByText('ERR_SESSION_LOAD_001')).toBeInTheDocument());

    expect(localStorage.getItem('dogule_token')).toBeNull();
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  it('logs in and renders the dashboard', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit | undefined) => {
        if (typeof input === 'string' && input === '/auth/login') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              token: 'token-789',
            }),
          });
        }

        if (input === '/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              user: {
                sub: 'user-2',
                email: 'new@example.com',
                role: 'user',
                name: 'New User',
              },
            }),
          });
        }

        if (input === '/dashboard') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              kundenCount: 1,
              hundeCount: 1,
              kurseCount: 2,
              finanzenCount: 0,
              kalenderCount: 0,
              kommunikationCount: 0,
            }),
          });
        }

        return Promise.reject(new Error(`Unexpected fetch: ${input}`));
      });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument(),
    );

    expect(localStorage.getItem('dogule_token')).toBe('token-789');
    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/dashboard',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-789' }),
      }),
    );
    expect(screen.getByText('New User')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
