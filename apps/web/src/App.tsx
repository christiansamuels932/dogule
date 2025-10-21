import { createConsoleSpy } from '@dogule/testing';
import { FormEvent, useEffect, useState } from 'react';

export const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const consoleSpy = createConsoleSpy();
    console.log('Web app mounted');
    consoleSpy.restore();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setStatus('Invalid credentials');
        return;
      }

      const result = await response.json();

      if (result?.token) {
        localStorage.setItem('dogule_token', result.token as string);
        setStatus('Logged in');
      } else {
        setStatus('Unexpected response');
      }
    } catch (error) {
      console.error('Failed to login', error);
      setStatus('Unable to reach server');
    }
  };

  return (
    <main>
      <h1>Welcome to Dogule</h1>
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
        <button type="submit">Login</button>
      </form>
      {status && (
        <p role="status">{status === 'loading' ? 'Logging in…' : status}</p>
      )}
    </main>
  );
};

export default App;
