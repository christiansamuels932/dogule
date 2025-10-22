import { useEffect, useMemo, useState } from 'react';

import { ErrorCode, type DashboardSummary } from '@dogule/domain';

import { createDashboardClient, type DashboardClient } from '../../sdk';

export interface UseDashboardResult {
  data: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseDashboardOptions {
  token: string | null;
}

export const useDashboard = ({ token }: UseDashboardOptions): UseDashboardResult => {
  const client = useMemo<DashboardClient | null>(() => {
    if (!token) {
      return null;
    }

    return createDashboardClient(token);
  }, [token]);

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const summary = await client.getSummary();

        if (!cancelled) {
          setData(summary);
        }
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : ErrorCode.ERR_DASHBOARD_LOAD_001;

        if (!cancelled) {
          setError(message);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSummary().catch((caught) => {
      console.error(ErrorCode.ERR_DASHBOARD_LOAD_001, caught);
    });

    return () => {
      cancelled = true;
    };
  }, [client]);

  return {
    data,
    isLoading,
    error,
  };
};
