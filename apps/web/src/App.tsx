import { createConsoleSpy } from '@dogule/testing';
import { FormEvent, useEffect, useState } from 'react';

const TOKEN_STORAGE_KEY = 'dogule_token';

interface UserProfile {
  sub: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

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

  useEffect(() => {
    const consoleSpy = createConsoleSpy();
    console.log('Web app mounted');
    consoleSpy.restore();
  }, []);

  useEffect(() => {
    if (!token || user) {
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
          throw new Error('ERR_SESSION_LOAD_001');
        }

        const result = (await response.json()) as { user?: UserProfile } | undefined;

        if (!result?.user) {
          throw new Error('ERR_SESSION_LOAD_001');
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
          setSessionError('ERR_SESSION_LOAD_001');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    restoreSession().catch((error) => {
      console.error('ERR_SESSION_LOAD_001', error);
    });

    return () => {
      cancelled = true;
    };
  }, [token, user]);

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

      if (result?.token && result.user) {
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        setToken(result.token);
        setUser(result.user);
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

  return (
    <main>
      <h1>Dogule Portal</h1>
      {token && user ? (
        <section aria-label="dashboard">
          <h2>Dashboard</h2>
          <p>Welcome back, {user.email}!</p>
          <section aria-label="profile">
            <h3>Profile</h3>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{user.role}</dd>
              </div>
            </dl>
          </section>
          <section aria-label="quick-links">
            <h3>Quick Links</h3>
            <ul>
              <li>
                <a href="/kunden">Kunden</a>
              </li>
              <li>
                <a href="/hunde">Hunde</a>
              </li>
              <li>
                <a href="/kurse">Kurse</a>
              </li>
            </ul>
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
      {isLoadingProfile && (
        <p role="status">Loading session…</p>
      )}
      {sessionError && <p role="alert">{sessionError}</p>}
    </main>
  );
};

export default App;
