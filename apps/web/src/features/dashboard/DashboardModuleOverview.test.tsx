import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '@dogule/domain';

import { DashboardModuleOverview } from './DashboardModuleOverview';

describe('DashboardModuleOverview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('shows a loading state while fetching the summary', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn().mockReturnValue(fetchPromise);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<DashboardModuleOverview token="token-123" />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/dashboard',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        }),
      ),
    );
    expect(await screen.findByRole('status', { name: 'Dashboard wird geladen…' })).toBeInTheDocument();

    resolveFetch?.({
      ok: true,
      json: async () => ({
        kundenCount: 1,
        hundeCount: 2,
        kurseCount: 3,
        finanzenCount: 4,
        finanzenEinnahmen: 5,
        finanzenAusgaben: 6,
        kalenderCount: 7,
        kommunikationCount: 8,
      }),
    });

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'Dashboard wird geladen…' })).not.toBeInTheDocument(),
    );
  });

  it('renders an error message when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<DashboardModuleOverview token="token-456" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(await screen.findByRole('alert')).toHaveTextContent(ErrorCode.ERR_DASHBOARD_LOAD_001);
    expect(screen.getAllByText('0')).not.toHaveLength(0);
  });

  it('renders the dashboard summary when the request succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kundenCount: 4,
        hundeCount: 2,
        kurseCount: 3,
        finanzenCount: 1,
        finanzenEinnahmen: 1000,
        finanzenAusgaben: 500,
        kalenderCount: 5,
        kommunikationCount: 6,
      }),
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<DashboardModuleOverview token="token-789" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Dashboard wird geladen…' })).not.toBeInTheDocument();
  });
});
