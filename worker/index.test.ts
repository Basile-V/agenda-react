import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { server } from '../src/test/server';
import worker from './index';
import { prefixCookiePath } from './paths';

const env = { API_ORIGIN: 'https://backend.test' };
const APP = 'https://agenda.example/backend';

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

describe('request', () => {
  test('strips the /backend prefix and keeps the query string', async () => {
    const received = captureBackendRequests();
    await worker.fetch(new Request(`${APP}/api/events?date=2026-09-30`), env);
    expect(received[0]?.url).toBe('https://backend.test/api/events?date=2026-09-30');
  });

  test('keeps the method, the body, the cookies and the CSRF header', async () => {
    const received = captureBackendRequests();
    await worker.fetch(
      new Request(`${APP}/api/events`, {
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
      new Request(`${APP}/api/auth/me`, { headers: { Origin: 'https://agenda.example' } }),
      env,
    );
    expect(received[0]?.headers.has('Origin')).toBe(false);
  });

  // The visitor's cookies travel with the request: they must never leave for another host.
  test.each([
    ['//evil.example/steal?x=1', 'https://backend.test//evil.example/steal?x=1'],
    ['/%2F%2Fevil.example/steal', 'https://backend.test/%2F%2Fevil.example/steal'],
    ['@evil.example/steal', 'https://backend.test/@evil.example/steal'],
  ])('only ever forwards to the backend: /backend%s', async (path, expected) => {
    const received = captureBackendRequests();
    await worker.fetch(
      new Request(`${APP}${path}`, { headers: { Cookie: 'access_token=abc' } }),
      env,
    );
    expect(received.map((request) => request.url)).toEqual([expected]);
  });
});

describe('response', () => {
  test("returns the backend's response as is", async () => {
    captureBackendRequests();
    const response = await worker.fetch(new Request(`${APP}/api/auth/me`), env);
    expect(response.status).toBe(201);
    expect(response.headers.get('X-Backend')).toBe('yes');
    expect(await response.json()).toEqual({ ok: true });
  });

  test('moves the cookie paths under /backend, so the browser sends them back', async () => {
    server.use(
      http.post('https://backend.test/api/auth/login', () => {
        const headers = new Headers();
        headers.append('Set-Cookie', 'access_token=a; Path=/; HttpOnly; Secure');
        headers.append('Set-Cookie', 'refresh_token=r; Path=/api/auth; HttpOnly; Secure');
        return HttpResponse.json({ id: 2 }, { headers });
      }),
    );
    const response = await worker.fetch(
      new Request(`${APP}/api/auth/login`, { method: 'POST' }),
      env,
    );

    expect(response.headers.getSetCookie()).toEqual([
      'access_token=a; Path=/; HttpOnly; Secure',
      'refresh_token=r; Path=/backend/api/auth; HttpOnly; Secure',
    ]);
    expect(await response.json()).toEqual({ id: 2 });
  });
});

describe('prefixCookiePath', () => {
  test.each([
    [
      'refresh_token=r; Path=/api/auth; HttpOnly',
      'refresh_token=r; Path=/backend/api/auth; HttpOnly',
    ],
    ['refresh_token=r; path=/api/auth', 'refresh_token=r; path=/backend/api/auth'],
    ['access_token=a; Path=/; HttpOnly', 'access_token=a; Path=/; HttpOnly'],
    ['XSRF-TOKEN=x; Secure', 'XSRF-TOKEN=x; Secure'],
  ])('%s → %s', (cookie, expected) => {
    expect(prefixCookiePath(cookie)).toBe(expected);
  });
});
