/**
 * Cloudflare Worker, run before the static assets for /api/* only (see wrangler.json).
 *
 * It forwards API calls to the backend so that, for the browser, the app and its API share
 * one origin: no CORS, first-party session cookies (not blocked as third-party ones), and a
 * CSRF cookie that JavaScript can read. Everything else is served from dist/ directly.
 */
type Env = {
  /** Backend origin, e.g. https://agenda-o5su.onrender.com (wrangler.json "vars"). */
  API_ORIGIN: string;
};

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    // Same-origin for the browser. Forwarded as is, Spring would compare it with its own host
    // and reject the request as a CORS violation.
    headers.delete('Origin');

    // Method, headers (cookies, X-XSRF-TOKEN) and body copied explicitly onto the backend URL.
    // The response, Set-Cookie included, goes back untouched: the backend's cookies have no
    // Domain attribute, so the browser binds them to this origin.
    return fetch(new URL(url.pathname + url.search, env.API_ORIGIN), {
      method: request.method,
      headers,
      body: BODYLESS_METHODS.has(request.method) ? undefined : await request.arrayBuffer(),
      // Let the browser see and follow redirects itself.
      redirect: 'manual',
    });
  },
};
