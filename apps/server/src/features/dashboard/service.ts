import type { DashboardSummary } from '../../../../../packages/domain';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';
import { KundenRepository } from '../kunden/repository';
import { KurseRepository } from '../kurse/repository';

const SUMMARY_QUERIES: Record<Exclude<keyof DashboardSummary, 'kundenCount' | 'kurseCount'>, string> = {
  hundeCount: 'SELECT COUNT(*)::int AS count FROM hunde',
  finanzenCount: 'SELECT COUNT(*)::int AS count FROM finanzen',
  kalenderCount: 'SELECT COUNT(*)::int AS count FROM kalender',
  kommunikationCount: 'SELECT COUNT(*)::int AS count FROM kommunikation',
};

type Database = Pick<DatabaseClient, 'query'>;

const createEmptySummary = (): DashboardSummary => ({
  kundenCount: 0,
  hundeCount: 0,
  kurseCount: 0,
  finanzenCount: 0,
  kalenderCount: 0,
  kommunikationCount: 0,
});

export class DashboardService {
  constructor(
    private readonly database: Database = getDatabaseClient(),
    private readonly kundenRepository = new KundenRepository(),
    private readonly kurseRepository = new KurseRepository(),
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const summary = createEmptySummary();

    try {
      summary.kundenCount = await this.kundenRepository.count();
    } catch (error) {
      console.error('ERR_DASHBOARD_001', error);
      summary.kundenCount = 0;
    }

    try {
      summary.kurseCount = await this.kurseRepository.count();
    } catch (error) {
      console.error('ERR_DASHBOARD_001', error);
      summary.kurseCount = 0;
    }

    for (const [key, query] of Object.entries(SUMMARY_QUERIES) as Array<
      [Exclude<keyof DashboardSummary, 'kundenCount' | 'kurseCount'>, string]
    >) {
      try {
        const rows = await this.database.query<{ count: number }>({ text: query });
        summary[key] = rows[0]?.count ?? 0;
      } catch (error) {
        console.error('ERR_DASHBOARD_001', error);
        summary[key] = 0;
      }
    }

    return summary;
  }
}
