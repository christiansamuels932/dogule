import { ErrorCode, type DashboardSummary } from '@dogule/domain';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';
import { KundenRepository } from '../kunden/repository';
import { HundeRepository } from '../hunde/repository';
import { FinanzenRepository } from '../finanzen/repository';
import { KalenderRepository } from '../kalender/repository';
import { logError } from '@dogule/utils';

const SUMMARY_QUERIES: Record<'kurseCount' | 'finanzenCount' | 'kalenderCount', string> = {
  kurseCount: 'SELECT COUNT(*)::int AS count FROM kurse',
  finanzenCount: 'SELECT COUNT(*)::int AS count FROM finanzen',
  kalenderCount: 'SELECT COUNT(*)::int AS count FROM kalender_events',
  kommunikationCount: 'SELECT COUNT(*)::int AS count FROM kommunikation',
};

type Database = Pick<DatabaseClient, 'query'>;

const createEmptySummary = (): DashboardSummary => ({
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

export class DashboardService {
  constructor(
    private readonly database: Database = getDatabaseClient(),
    private readonly kundenRepository = new KundenRepository(),
    private readonly hundeRepository = new HundeRepository(),
    private readonly finanzenRepository = new FinanzenRepository(),
    private readonly kalenderRepository = new KalenderRepository(),
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const summary = createEmptySummary();

    try {
      summary.kundenCount = await this.kundenRepository.count();
    } catch (error) {
      logError(ErrorCode.ERR_DASHBOARD_001, error);
      summary.kundenCount = 0;
    }

    try {
      summary.hundeCount = await this.hundeRepository.count();
    } catch (error) {
      logError(ErrorCode.ERR_DASHBOARD_001, error);
      summary.hundeCount = 0;
    }

    for (const [key, query] of Object.entries(SUMMARY_QUERIES) as Array<
      [Exclude<keyof DashboardSummary, 'kundenCount' | 'hundeCount' | 'kommunikationCount'>, string]
    >) {
      try {
        const rows = await this.database.query<{ count: number }>({ text: query });
        summary[key] = rows[0]?.count ?? 0;
      } catch (error) {
        logError(ErrorCode.ERR_DASHBOARD_001, error);
        summary[key] = 0;
      }
    }

    try {
      summary.kommunikationCount = await this.kommunikationRepository.count();
    } catch (error) {
      logError(ErrorCode.ERR_DASHBOARD_001, error);
      summary.kommunikationCount = 0;
    }

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const fromDate = from.toISOString().slice(0, 10);

    try {
      const [einnahmen, ausgaben] = await Promise.all([
        this.finanzenRepository.sum({ typ: 'einnahme', from: fromDate }),
        this.finanzenRepository.sum({ typ: 'ausgabe', from: fromDate }),
      ]);
      summary.finanzenEinnahmen = einnahmen;
      summary.finanzenAusgaben = ausgaben;
    } catch (error) {
      logError('ERR_DASHBOARD_001', error);
      summary.finanzenEinnahmen = 0;
      summary.finanzenAusgaben = 0;
    }

    try {
      const rangeStart = now.toISOString();
      const rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      summary.eventsUpcoming7d = await this.kalenderRepository.count({
        from: rangeStart,
        to: rangeEnd,
      });
    } catch (error) {
      logError(ErrorCode.ERR_DASHBOARD_001, error);
      summary.eventsUpcoming7d = 0;
    }

    return summary;
  }
}
