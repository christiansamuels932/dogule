import { ErrorCode, type DashboardSummary } from '@dogule/domain';

export interface DashboardClient {
  getSummary: () => Promise<DashboardSummary>;
}

const DASHBOARD_ENDPOINT = '/dashboard';

export const createDashboardClient = (token: string | null): DashboardClient => {
  const getSummary = async (): Promise<DashboardSummary> => {
    if (!token) {
      throw new Error(ErrorCode.ERR_DASHBOARD_LOAD_001);
    }

    const response = await fetch(DASHBOARD_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(ErrorCode.ERR_DASHBOARD_LOAD_001);
    }

    const result = (await response.json()) as DashboardSummary | undefined;

    if (!result) {
      throw new Error(ErrorCode.ERR_DASHBOARD_LOAD_001);
    }

    return result;
  };

  return {
    getSummary,
  };
};
