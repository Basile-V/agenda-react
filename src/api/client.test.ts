import { http, HttpResponse } from 'msw';
import { describe, expect, test, vi } from 'vitest';
import { apiUrl, setXsrfCookie } from '../test/handlers';
import { server } from '../test/server';
import { ApiError, apiFetch, getXsrfToken, onSessionExpired } from './client';

/** Records the requests reaching `path`, answering with `respond` (called with the call index). */
function spyOn(
  method: 'get' | 'post' | 'put',
  path: string,
  respond: (call: number, request: Request) => Response | Promise<Response>,
) {
  const requests: Request[] = [];
  server.use(
    http[method](apiUrl(path), ({ request }) => {
      requests.push(request.clone());
      return respond(requests.length - 1, request);
    }),
  );
  return requests;
}

const ok = () => HttpResponse.json({ ok: true });
const status = (code: number, body?: unknown) =>
  body === undefined
    ? new HttpResponse(null, { status: code })
    : HttpResponse.json(body, { status: code });

describe('request', () => {
  test('sends the session cookies', async () => {
    const requests = spyOn('get', '/api/thing', ok);
    await apiFetch('/api/thing');
    expect(requests[0]?.credentials).toBe('include');
  });

  test('prefixes the path with VITE_API_BASE_URL', async () => {
    const requests = spyOn('get', '/api/thing', ok);
    await apiFetch('/api/thing');
    expect(requests[0]?.url).toBe('http://api.test/api/thing');
  });

  test('sends the body as JSON', async () => {
    const requests = spyOn('post', '/api/thing', ok);
    setXsrfCookie('token');
    await apiFetch('/api/thing', { method: 'POST', body: { a: 1 } });
    expect(requests[0]?.headers.get('Content-Type')).toBe('application/json');
    expect(await requests[0]?.json()).toEqual({ a: 1 });
  });
});

describe('CSRF', () => {
  test('reads the token from the XSRF-TOKEN cookie', () => {
    expect(getXsrfToken()).toBeNull();
    setXsrfCookie('abc%3D');
    expect(getXsrfToken()).toBe('abc=');
  });

  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])('sends X-XSRF-TOKEN on %s', async (method) => {
    const requests: Request[] = [];
    server.use(
      http.all(apiUrl('/api/thing'), ({ request }) => {
        requests.push(request);
        return ok();
      }),
    );
    setXsrfCookie('token-1');
    await apiFetch('/api/thing', { method });
    expect(requests[0]?.headers.get('X-XSRF-TOKEN')).toBe('token-1');
  });

  test('does not send it on GET', async () => {
    const requests = spyOn('get', '/api/thing', ok);
    setXsrfCookie('token-1');
    await apiFetch('/api/thing');
    expect(requests[0]?.headers.has('X-XSRF-TOKEN')).toBe(false);
  });

  test('replays once with the new token when a 403 renewed it', async () => {
    setXsrfCookie('stale');
    const requests = spyOn('post', '/api/thing', (call) => {
      if (call === 0) {
        setXsrfCookie('fresh');
        return status(403);
      }
      return ok();
    });

    await expect(apiFetch('/api/thing', { method: 'POST' })).resolves.toEqual({ ok: true });
    expect(requests.map((r) => r.headers.get('X-XSRF-TOKEN'))).toEqual(['stale', 'fresh']);
  });

  test('replays when the first request had no token yet', async () => {
    const requests = spyOn('post', '/api/thing', (call) => {
      if (call === 0) {
        setXsrfCookie('fresh');
        return status(403);
      }
      return ok();
    });

    await apiFetch('/api/thing', { method: 'POST' });
    expect(requests.map((r) => r.headers.get('X-XSRF-TOKEN'))).toEqual([null, 'fresh']);
  });

  test('does not replay a 403 when the token did not change', async () => {
    setXsrfCookie('same');
    const requests = spyOn('post', '/api/thing', () => status(403));
    await expect(apiFetch('/api/thing', { method: 'POST' })).rejects.toMatchObject({ status: 403 });
    expect(requests).toHaveLength(1);
  });

  test('replays at most once', async () => {
    let n = 0;
    const requests = spyOn('post', '/api/thing', () => {
      setXsrfCookie(`token-${++n}`);
      return status(403);
    });
    await expect(apiFetch('/api/thing', { method: 'POST' })).rejects.toMatchObject({ status: 403 });
    expect(requests).toHaveLength(2);
  });

  test('does not replay a 403 on GET', async () => {
    const requests = spyOn('get', '/api/thing', () => {
      setXsrfCookie('fresh');
      return status(403);
    });
    await expect(apiFetch('/api/thing')).rejects.toMatchObject({ status: 403 });
    expect(requests).toHaveLength(1);
  });
});

describe('session refresh on 401', () => {
  test('refreshes the session, then replays the request', async () => {
    const refreshes = spyOn('post', '/api/auth/refresh', () => status(204));
    const requests = spyOn('get', '/api/thing', (call) => (call === 0 ? status(401) : ok()));

    await expect(apiFetch('/api/thing')).resolves.toEqual({ ok: true });
    expect(refreshes).toHaveLength(1);
    expect(requests).toHaveLength(2);
  });

  test('concurrent 401s share a single refresh', async () => {
    const refreshes = spyOn('post', '/api/auth/refresh', () => status(204));
    const seen = new Map<string, number>();
    server.use(
      http.get(apiUrl('/api/:name'), ({ params }) => {
        const name = String(params.name);
        seen.set(name, (seen.get(name) ?? 0) + 1);
        return seen.get(name) === 1 ? status(401) : HttpResponse.json(name);
      }),
    );

    await expect(
      Promise.all([apiFetch('/api/a'), apiFetch('/api/b'), apiFetch('/api/c')]),
    ).resolves.toEqual(['a', 'b', 'c']);
    expect(refreshes).toHaveLength(1);
  });

  test('a later 401 triggers a new refresh', async () => {
    const refreshes = spyOn('post', '/api/auth/refresh', () => status(204));
    spyOn('get', '/api/thing', (call) => (call % 2 === 0 ? status(401) : ok()));
    await apiFetch('/api/thing');
    await apiFetch('/api/thing');
    expect(refreshes).toHaveLength(2);
  });

  test('when the refresh fails: session expired, 401 error, no replay', async () => {
    spyOn('post', '/api/auth/refresh', () =>
      status(401, { message: 'Jeton de rafraîchissement invalide' }),
    );
    const requests = spyOn('get', '/api/thing', () => status(401));
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);

    await expect(apiFetch('/api/thing')).rejects.toEqual(new ApiError(401));
    expect(listener).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(1);
    unsubscribe();
  });

  test('notifies session expiry once for concurrent requests', async () => {
    spyOn('post', '/api/auth/refresh', () => status(401));
    server.use(http.get(apiUrl('/api/:name'), () => status(401)));
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);

    await Promise.allSettled([apiFetch('/api/a'), apiFetch('/api/b')]);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  test('an unsubscribed listener is not called', async () => {
    spyOn('post', '/api/auth/refresh', () => status(401));
    spyOn('get', '/api/thing', () => status(401));
    const listener = vi.fn();
    onSessionExpired(listener)();

    await expect(apiFetch('/api/thing')).rejects.toBeInstanceOf(ApiError);
    expect(listener).not.toHaveBeenCalled();
  });

  test('an unreachable server during refresh does not expire the session', async () => {
    spyOn('post', '/api/auth/refresh', () => HttpResponse.error());
    spyOn('get', '/api/thing', () => status(401));
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);

    await expect(apiFetch('/api/thing')).rejects.toMatchObject({ status: 0 });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test.each(['/api/auth/login', '/api/auth/register', '/api/auth/logout'])(
    'never refreshes for %s, whose 401 is the answer itself',
    async (path) => {
      const refreshes = spyOn('post', '/api/auth/refresh', () => status(204));
      const requests = spyOn('post', path, () => status(401));
      await expect(apiFetch(path, { method: 'POST' })).rejects.toMatchObject({ status: 401 });
      expect(refreshes).toHaveLength(0);
      expect(requests).toHaveLength(1);
    },
  );

  test('refreshes for /api/auth/me: restoring a session outlives the access token', async () => {
    const refreshes = spyOn('post', '/api/auth/refresh', () => status(204));
    const requests = spyOn('get', '/api/auth/me', (call) => (call === 0 ? status(401) : ok()));

    await expect(apiFetch('/api/auth/me')).resolves.toEqual({ ok: true });
    expect(refreshes).toHaveLength(1);
    expect(requests).toHaveLength(2);
  });
});

describe('responses and errors', () => {
  test('an empty body resolves to undefined', async () => {
    spyOn('get', '/api/thing', () => status(204));
    await expect(apiFetch('/api/thing')).resolves.toBeUndefined();
  });

  test('a 400 carries the server message', async () => {
    spyOn('post', '/api/thing', () => status(400, { message: "Nom d'utilisateur déjà utilisé" }));
    const error = await apiFetch('/api/thing', { method: 'POST' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: "Nom d'utilisateur déjà utilisé" });
  });

  test('technical server messages are replaced by a readable one', async () => {
    setXsrfCookie('same');
    spyOn('put', '/api/thing', () =>
      status(403, { message: "L'utilisateur 3 n'est pas autorisé…" }),
    );
    await expect(apiFetch('/api/thing', { method: 'PUT' })).rejects.toMatchObject({
      status: 403,
      message: "Vous n'avez pas le droit d'effectuer cette action.",
    });
  });

  test('a body without message falls back to a generic message', async () => {
    spyOn('get', '/api/thing', () => new HttpResponse('<html>oops</html>', { status: 500 }));
    await expect(apiFetch('/api/thing')).rejects.toMatchObject({
      status: 500,
      message: 'Une erreur est survenue. Réessayez.',
    });
  });

  test('an unreachable server is an ApiError with status 0', async () => {
    spyOn('get', '/api/thing', () => HttpResponse.error());
    await expect(apiFetch('/api/thing')).rejects.toMatchObject({
      status: 0,
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
    });
  });

  test('an aborted request rejects with an AbortError, not an ApiError', async () => {
    spyOn('get', '/api/thing', ok);
    const controller = new AbortController();
    controller.abort();
    await expect(apiFetch('/api/thing', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
