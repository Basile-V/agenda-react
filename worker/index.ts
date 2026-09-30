/**
 * Cloudflare Worker, run before the static assets for /backend/* only (see wrangler.json).
 *
 * It forwards API calls to the backend so that, for the browser, the app and its API share
 * one origin: no CORS, first-party session cookies (not blocked as third-party ones), and a
 * CSRF cookie that JavaScript can read. Everything else is served from dist/ directly.
 *
 * The API is exposed under /backend rather than /api: EasyPrivacy, enabled by default in
 * uBlock Origin, blocks `||workers.dev/api/event`, hence GET /api/events on a workers.dev host.
 */
import { PREFIX, prefixCookiePath } from './paths';

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

type Env = {
  /** Backend origin, e.g. https://agenda-o5su.onrender.com (wrangler.json "vars"). */
  API_ORIGIN: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    // Same-origin for the browser. Forwarded as is, Spring would compare it with its own host
    // and reject the request as a CORS violation.
    headers.delete('Origin');

    // Method, headers (cookies, X-XSRF-TOKEN) and body copied explicitly onto the backend URL.
    const backendPath = url.pathname.slice(PREFIX.length) || '/';
    const response = await fetch(new URL(backendPath + url.search, env.API_ORIGIN), {
      method: request.method,
      headers,
      body: BODYLESS_METHODS.has(request.method) ? undefined : await request.arrayBuffer(),
      // Let the browser see and follow redirects itself.
      redirect: 'manual',
    });

    // The backend's cookies have no Domain attribute: the browser binds them to this origin.
    // Only their paths need the prefix.
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length === 0) return response;
    const proxied = new Response(response.body, response);
    proxied.headers.delete('Set-Cookie');
    for (const cookie of setCookies) proxied.headers.append('Set-Cookie', prefixCookiePath(cookie));
    return proxied;
  },
};
