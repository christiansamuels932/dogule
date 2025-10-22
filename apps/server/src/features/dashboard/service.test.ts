import { describe, expect, it, vi } from 'vitest';

import { DashboardService } from './service';

describe('DashboardService', () => {
  it('logs ERR_DASHBOARD_001 and returns zeros when queries fail', async () => {
    const database = {
      query: vi.fn().mockRejectedValue(new Error('query failed')),
    };
    const kundenRepository = {
      count: vi.fn().mockRejectedValue(new Error('kunden failed')),
    };
    const hundeRepository = {
      count: vi.fn().mockRejectedValue(new Error('hunde failed')),
    };
    const finanzenRepository = {
      sum: vi.fn().mockRejectedValue(new Error('sum failed')),
    };
    const kalenderRepository = {
      count: vi.fn().mockRejectedValue(new Error('kalender failed')),
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = new DashboardService(
      database as unknown as { query: typeof database.query },
      kundenRepository as unknown as { count: () => Promise<number> },
      hundeRepository as unknown as { count: () => Promise<number> },
      finanzenRepository as unknown as { sum: () => Promise<number> },
      kalenderRepository as unknown as { count: () => Promise<number> },
    );

    const summary = await service.getSummary();

    expect(summary).toEqual({
      kundenCount: 0,
      hundeCount: 0,
      kurseCount: 0,
      finanzenCount: 0,
      finanzenEinnahmen: 0,
      finanzenAusgaben: 0,
      kalenderCount: 0,
      kommunikationCount: 0,
      eventsUpcoming7d: 0,
    });
    expect(database.query).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(ErrorCode.ERR_DASHBOARD_001, expect.any(Error));

    logSpy.mockRestore();
  });
});
