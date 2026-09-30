import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { server } from '../src/test/server';
import worker from './index';

const env = { API_ORIGIN: 'https://backend.test' };

function captureBackendRequests() {
  const received: Request[] = [];
  server.use(
    http.all('https://backend.test/*', ({ request }) => {
      received.push(request.clone());
      return HttpResponse.json({ ok: true }, { status: 201, headers: { 'X-Backend': 'yes' } });
    }),
  );
  return received;
}

test('forwards the path and query string to the backend', async () => {
  const received = captureBackendRequests();
  await worker.fetch(new Request('https://agenda.example/api/events?date=2026-09-30'), env);
  expect(received[0]?.url).toBe('https://backend.test/api/events?date=2026-09-30');
});

test('keeps the method, the body, the cookies and the CSRF header', async () => {
  const received = captureBackendRequests();
  await worker.fetch(
    new Request('https://agenda.example/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'access_token=abc; XSRF-TOKEN=t1',
        'X-XSRF-TOKEN': 't1',
      },
      body: JSON.stringify({ title: 'Atelier' }),
    }),
    env,
  );

  const request = received[0];
  expect(request?.method).toBe('POST');
  expect(await request?.json()).toEqual({ title: 'Atelier' });
  expect(request?.headers.get('Cookie')).toBe('access_token=abc; XSRF-TOKEN=t1');
  expect(request?.headers.get('X-XSRF-TOKEN')).toBe('t1');
});

test('drops the Origin header, which would make the backend apply CORS', async () => {
  const received = captureBackendRequests();
  await worker.fetch(
    new Request('https://agenda.example/api/auth/me', {
      headers: { Origin: 'https://agenda.example' },
    }),
    env,
  );
  expect(received[0]?.headers.has('Origin')).toBe(false);
});

test("returns the backend's response untouched", async () => {
  captureBackendRequests();
  const response = await worker.fetch(new Request('https://agenda.example/api/auth/me'), env);
  expect(response.status).toBe(201);
  expect(response.headers.get('X-Backend')).toBe('yes');
  expect(await response.json()).toEqual({ ok: true });
});

test('passes the session cookies set by the backend back to the browser', async () => {
  server.use(
    http.post('https://backend.test/api/auth/login', () =>
      HttpResponse.json({}, { headers: { 'Set-Cookie': 'access_token=abc; Path=/; HttpOnly' } }),
    ),
  );
  const response = await worker.fetch(
    new Request('https://agenda.example/api/auth/login', { method: 'POST' }),
    env,
  );
  expect(response.headers.get('Set-Cookie')).toBe('access_token=abc; Path=/; HttpOnly');
});
