// Kept out of index.ts: the Workers runtime treats every export of the main module as an
// entry point, and rejects anything that is not a handler.

/** Must match VITE_API_BASE_URL in .env.production and run_worker_first in wrangler.json. */
export const PREFIX = '/backend';

/**
 * The backend scopes some cookies to its own paths (refresh_token: Path=/api/auth). Seen from
 * the browser those paths live under PREFIX, otherwise the cookie would never be sent back.
 */
export function prefixCookiePath(setCookie: string): string {
  return setCookie.replace(/(;\s*path=)(\/[^;]*)/i, (match, attribute: string, path: string) =>
    path === '/' ? match : `${attribute}${PREFIX}${path}`,
  );
}
