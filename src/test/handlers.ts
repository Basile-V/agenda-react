import { http, HttpResponse, type RequestHandler } from 'msw';
import { isRecord } from '../api/client';
import type { CalendarEvent, EventPayload } from '../api/types';
import { db, withoutPassword } from './db';

// Shared by the tests (msw/node) and `npm run dev:mock` (msw/browser).

export const apiUrl = (path: string) => `${import.meta.env.VITE_API_BASE_URL}${path}`;

const XSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_EXEMPT = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

export function readXsrfCookie(): string | null {
  return new RegExp(`(?:^|; )${XSRF_COOKIE}=([^;]*)`).exec(document.cookie)?.[1] ?? null;
}

export function setXsrfCookie(token: string) {
  document.cookie = `${XSRF_COOKIE}=${token}; path=/`;
}

export function clearXsrfCookie() {
  document.cookie = `${XSRF_COOKIE}=; path=/; max-age=0`;
}

const error = (status: number, message: string) => HttpResponse.json({ message }, { status });

function currentUser() {
  return db.users.find((user) => user.id === db.sessionUserId) ?? null;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return isRecord(body) ? body : {};
}

function isPayload(body: Record<string, unknown>): body is EventPayload {
  return (
    typeof body.date === 'string' &&
    typeof body.start === 'string' &&
    typeof body.duration === 'number' &&
    typeof body.isPublic === 'boolean'
  );
}

function toEvent(payload: EventPayload, id: number, ownerId: number): CalendarEvent {
  const { title, date, start, duration, isPublic } = payload;
  return { id, ...(title ? { title } : {}), date, start, duration, ownerId, isPublic };
}

export const handlers: RequestHandler[] = [
  // Like the backend's CsrfCookieFilter: every response carries the CSRF cookie, and mutating
  // requests must echo it in the X-XSRF-TOKEN header (double-submit).
  http.all(apiUrl('/api/*'), ({ request }) => {
    const token = readXsrfCookie() ?? crypto.randomUUID();
    setXsrfCookie(token);
    const path = new URL(request.url).pathname;
    if (request.method !== 'GET' && !CSRF_EXEMPT.includes(path)) {
      if (request.headers.get('X-XSRF-TOKEN') !== token) return error(403, 'Accès refusé');
    }
  }),

  http.post(apiUrl('/api/auth/login'), async ({ request }) => {
    const { username, password } = await readBody(request);
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (!user) return error(401, 'Identifiants invalides');
    db.sessionUserId = user.id;
    return HttpResponse.json(withoutPassword(user));
  }),

  http.post(apiUrl('/api/auth/register'), async ({ request }) => {
    const { username, password, displayName } = await readBody(request);
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      typeof displayName !== 'string'
    ) {
      return error(400, 'Requête invalide');
    }
    if (db.users.some((u) => u.username === username)) {
      return error(400, "Nom d'utilisateur déjà utilisé");
    }
    const user = { id: db.nextId++, username, password, displayName, role: 'USER' as const };
    db.users.push(user);
    db.sessionUserId = user.id;
    return HttpResponse.json(withoutPassword(user), { status: 201 });
  }),

  http.get(apiUrl('/api/auth/me'), () => {
    const user = currentUser();
    return user ? HttpResponse.json(withoutPassword(user)) : error(401, 'Authentification requise');
  }),

  http.post(apiUrl('/api/auth/refresh'), () =>
    currentUser()
      ? new HttpResponse(null, { status: 204 })
      : error(401, 'Jeton de rafraîchissement invalide'),
  ),

  http.post(apiUrl('/api/auth/logout'), () => {
    db.sessionUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(apiUrl('/api/events'), ({ request }) => {
    const user = currentUser();
    if (!user) return error(401, 'Authentification requise');
    const date = new URL(request.url).searchParams.get('date');
    return HttpResponse.json(
      db.events.filter((e) => e.date === date && (e.ownerId === user.id || e.isPublic)),
    );
  }),

  http.post(apiUrl('/api/events'), async ({ request }) => {
    const user = currentUser();
    if (!user) return error(401, 'Authentification requise');
    const body = await readBody(request);
    if (!isPayload(body)) return error(400, 'Requête invalide');
    const event = toEvent(body, db.nextId++, user.id);
    db.events.push(event);
    return HttpResponse.json(event, { status: 201 });
  }),

  http.put(apiUrl('/api/events/:id'), async ({ request, params }) => {
    const user = currentUser();
    if (!user) return error(401, 'Authentification requise');
    const index = db.events.findIndex((e) => e.id === Number(params.id));
    const existing = db.events[index];
    if (!existing) return error(404, `Aucun événement trouvé avec l'id : ${String(params.id)}`);
    if (existing.ownerId !== user.id) return error(403, 'Accès refusé');
    const body = await readBody(request);
    if (!isPayload(body)) return error(400, 'Requête invalide');
    const event = toEvent(body, existing.id, existing.ownerId);
    db.events[index] = event;
    return HttpResponse.json(event);
  }),

  http.delete(apiUrl('/api/events/:id'), ({ params }) => {
    const user = currentUser();
    if (!user) return error(401, 'Authentification requise');
    const existing = db.events.find((e) => e.id === Number(params.id));
    if (!existing) return error(404, `Aucun événement trouvé avec l'id : ${String(params.id)}`);
    if (existing.ownerId !== user.id) return error(403, 'Accès refusé');
    db.events = db.events.filter((e) => e !== existing);
    return new HttpResponse(null, { status: 204 });
  }),
];
