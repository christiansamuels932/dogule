import { createConsoleSpy } from '@dogule/testing';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { ErrorCode, type DashboardSummary } from '@dogule/domain';

const TOKEN_STORAGE_KEY = 'dogule_token';

interface UserProfile {
  sub: string;
  email: string;
  role: string;
  name?: string;
  [key: string]: unknown;
}

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

export const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [isLoginError, setIsLoginError] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to access storage', error);
      return null;
    }
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const consoleSpy = createConsoleSpy();
    console.log('Web app mounted');
    consoleSpy.restore();
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setSummary(null);
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      setIsLoadingProfile(true);
      setSessionError(null);

      try {
        const response = await fetch('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(ErrorCode.ERR_SESSION_LOAD_001);
        }

        const result = (await response.json()) as { user?: UserProfile } | undefined;

        if (!result?.user) {
          throw new Error(ErrorCode.ERR_SESSION_LOAD_001);
        }

        if (!cancelled) {
          setUser(result.user);
        }
      } catch (error) {
        console.error('Failed to restore session', error);
        localStorage.removeItem(TOKEN_STORAGE_KEY);

        if (!cancelled) {
          setToken(null);
          setUser(null);
          setSummary(null);
          setSessionError(ErrorCode.ERR_SESSION_LOAD_001);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    restoreSession().catch((error) => {
      console.error(ErrorCode.ERR_SESSION_LOAD_001, error);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setSummary(null);
      setSummaryError(null);
      return;
    }

    let cancelled = false;

    const loadSummary = async () => {
      setIsLoadingSummary(true);
      setSummaryError(null);

      try {
        const response = await fetch('/dashboard', {
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

        if (!cancelled) {
          setSummary(result);
        }
      } catch (error) {
        console.error('Failed to load dashboard summary', error);
        if (!cancelled) {
          setSummary(createEmptySummary());
          setSummaryError(ErrorCode.ERR_DASHBOARD_LOAD_001);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSummary(false);
        }
      }
    };

    loadSummary().catch((error) => {
      console.error(ErrorCode.ERR_DASHBOARD_LOAD_001, error);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage('Logging in…');
    setIsLoginError(false);
    setSessionError(null);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setLoginMessage('Invalid credentials');
        setIsLoginError(true);
        return;
      }

      const result = (await response.json()) as
        | { token?: string; user?: UserProfile }
        | undefined;

      if (result?.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        setToken(result.token);
        setUser(null);
        setSummary(null);
        setPassword('');
        setLoginMessage('Logged in');
      } else {
        setLoginMessage('Unexpected response');
        setIsLoginError(true);
      }
    } catch (error) {
      console.error('Failed to login', error);
      setLoginMessage('Unable to reach server');
      setIsLoginError(true);
    }
  };

  const dashboardSummary = useMemo(() => summary ?? createEmptySummary(), [summary]);
  const displayName = user?.name?.trim() ? user.name : user?.email;

  return (
    <main>
      <h1>Dogule Portal</h1>
      {token && user ? (
        <section aria-label="dashboard">
          <header>
            <h2>Dashboard</h2>
            <p>Welcome back, {displayName}!</p>
          </header>
          <section aria-label="profile">
            <h3>Profil</h3>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Rolle</dt>
                <dd>{user.role}</dd>
              </div>
            </dl>
          </section>
          <section aria-label="module-overview">
            <h3>Modulübersicht</h3>
            {summaryError && <p role="alert">{summaryError}</p>}
            <ul aria-label="Dashboard navigation">
              {DASHBOARD_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} aria-label={`${link.label} ansehen`}>
                    <article>
                      <h4>{link.label}</h4>
                      <p aria-label={`${link.label} Gesamtzahl`}>
                        {formatCount(dashboardSummary[link.summaryKey])}
                      </p>
                    </article>
                  </a>
                </li>
              ))}
            </ul>
            {isLoadingSummary && <p role="status">Dashboard wird geladen…</p>}
          </section>
        </section>
      ) : (
        <section aria-label="login">
          <h2>Login</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={isLoadingProfile}>
              {loginMessage === 'Logging in…' ? 'Logging in…' : 'Login'}
            </button>
          </form>
          {loginMessage && (
            <p role={isLoginError ? 'alert' : 'status'}>{loginMessage}</p>
          )}
        </section>
      )}
      {isLoadingProfile && <p role="status">Loading session…</p>}
      {sessionError && <p role="alert">{sessionError}</p>}
    </main>
  );
};

export default App;
