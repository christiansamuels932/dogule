import { useMemo } from 'react';

import { type DashboardSummary } from '@dogule/domain';

import { useDashboard } from './useDashboard';

interface DashboardLink {
  href: string;
  label: string;
  summaryKey: keyof DashboardSummary;
}

const DASHBOARD_LINKS: DashboardLink[] = [
  { href: '/kunden', label: 'Kunden', summaryKey: 'kundenCount' },
  { href: '/hunde', label: 'Hunde', summaryKey: 'hundeCount' },
  { href: '/kurse', label: 'Kurse', summaryKey: 'kurseCount' },
  { href: '/finanzen', label: 'Finanzen', summaryKey: 'finanzenCount' },
  { href: '/kalender', label: 'Kalender', summaryKey: 'kalenderCount' },
  { href: '/kommunikation', label: 'Kommunikation', summaryKey: 'kommunikationCount' },
];

const createEmptySummary = (): DashboardSummary => ({
  kundenCount: 0,
  hundeCount: 0,
  kurseCount: 0,
  finanzenCount: 0,
  finanzenEinnahmen: 0,
  finanzenAusgaben: 0,
  kalenderCount: 0,
  kommunikationCount: 0,
});

const formatCount = (value: number): string => new Intl.NumberFormat('de-DE').format(value);

export interface DashboardModuleOverviewProps {
  token: string | null;
}

export const DashboardModuleOverview = ({ token }: DashboardModuleOverviewProps) => {
  const { data, isLoading, error } = useDashboard({ token });
  const summary = useMemo(() => data ?? createEmptySummary(), [data]);

  return (
    <section aria-label="module-overview">
      <h3>Modulübersicht</h3>
      {error && <p role="alert">{error}</p>}
      <ul aria-label="Dashboard navigation">
        {DASHBOARD_LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href} aria-label={`${link.label} ansehen`}>
              <article>
                <h4>{link.label}</h4>
                <p aria-label={`${link.label} Gesamtzahl`}>
                  {formatCount(summary[link.summaryKey])}
                </p>
              </article>
            </a>
          </li>
        ))}
      </ul>
      {isLoading && <p role="status">Dashboard wird geladen…</p>}
    </section>
  );
};

export const __TESTING__ = {
  DASHBOARD_LINKS,
  createEmptySummary,
  formatCount,
};
