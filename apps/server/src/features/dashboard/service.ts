import type { DashboardSummary } from '../../../../../packages/domain';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';

import { logError } from '@dogule/utils';

const SUMMARY_QUERIES: Record<keyof DashboardSummary, string> = {
  kundenCount: 'SELECT COUNT(*)::int AS count FROM kunden',
  hundeCount: 'SELECT COUNT(*)::int AS count FROM hunde',
  kurseCount: 'SELECT COUNT(*)::int AS count FROM kurse',
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
  constructor(private readonly database: Database = getDatabaseClient()) {}

  async getSummary(): Promise<DashboardSummary> {
    const summary = createEmptySummary();

    for (const [key, query] of Object.entries(SUMMARY_QUERIES) as Array<
      [keyof DashboardSummary, string]
    >) {
      try {
        const rows = await this.database.query<{ count: number }>({ text: query });
        summary[key] = rows[0]?.count ?? 0;
      } catch (error) {
        logError('ERR_DASHBOARD_001', error);
        summary[key] = 0;
      }
    }

    return summary;
  }
}
