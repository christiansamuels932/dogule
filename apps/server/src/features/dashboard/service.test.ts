import { describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '@dogule/domain';

import { DashboardService } from './service';

describe('DashboardService', () => {
  it('logs ERR_DASHBOARD_001 and returns zeros when queries fail', async () => {
    const database = {
      query: vi.fn().mockRejectedValue(new Error('query failed')),
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = new DashboardService(database as unknown as { query: typeof database.query });

    const summary = await service.getSummary();

    expect(summary).toEqual({
      kundenCount: 0,
      hundeCount: 0,
      kurseCount: 0,
      finanzenCount: 0,
      kalenderCount: 0,
      kommunikationCount: 0,
    });
    expect(database.query).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(ErrorCode.ERR_DASHBOARD_001, expect.any(Error));

    consoleSpy.mockRestore();
  });
});
