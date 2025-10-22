import { http, HttpResponse } from './mockService';
import type { DashboardSummary } from '@dogule/domain';

export const MOCK_TOKEN = 'test-session-token';

export const MOCK_USER = {
  sub: 'user-123',
  email: 'trainer@example.com',
  role: 'admin',
  name: 'Admin Trainer',
};

export const VALID_CREDENTIALS = {
  email: 'trainer@example.com',
  password: 'super-secret',
};

const defaultSummary: DashboardSummary = {
  kundenCount: 1234,
  hundeCount: 58,
  kurseCount: 12,
  finanzenCount: 4,
  finanzenEinnahmen: 24500,
  finanzenAusgaben: 8300,
  kalenderCount: 9,
  kommunikationCount: 27,
};

export const handlers = [
  http.post('/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === VALID_CREDENTIALS.email && body.password === VALID_CREDENTIALS.password) {
      return HttpResponse.json({ token: MOCK_TOKEN });
    }

    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),
  http.get('/auth/me', ({ request }) => {
    const authorization = request.headers.get('authorization');

    if (authorization === `Bearer ${MOCK_TOKEN}`) {
      return HttpResponse.json({ user: MOCK_USER });
    }

    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
  http.get('/dashboard', ({ request }) => {
    const authorization = request.headers.get('authorization');

    if (authorization !== `Bearer ${MOCK_TOKEN}`) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(defaultSummary);
  }),
];
