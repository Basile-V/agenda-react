const XSRF_COOKIE = 'XSRF-TOKEN';
const XSRF_HEADER = 'X-XSRF-TOKEN';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Vous n'avez pas le droit d'effectuer cette action.",
  404: "Cet élément n'existe plus.",
};

export class ApiError extends Error {
  override name = 'ApiError';
  readonly status: number;

  /** `status` is 0 when the server could not be reached. */
  constructor(status: number, message?: string) {
    super(message ?? DEFAULT_MESSAGES[status] ?? 'Une erreur est survenue. Réessayez.');
    this.status = status;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The only place that knows where the CSRF token comes from. Cross-site deployments cannot
 * read the backend's cookie: switch this to a token received in a response header.
 */
export function getXsrfToken(): string | null {
  const match = new RegExp(`(?:^|; )${XSRF_COOKIE}=([^;]*)`).exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

const sessionExpiredListeners = new Set<() => void>();

/** Called when the session cannot be refreshed anymore. Returns an unsubscribe function. */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal };

async function send(path: string, { method = 'GET', body, signal }: RequestOptions) {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const xsrfToken = MUTATING_METHODS.has(method) ? getXsrfToken() : null;
  if (xsrfToken) headers.set(XSRF_HEADER, xsrfToken);

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal,
    });
    return { response, xsrfToken };
  } catch (error) {
    // An abort is not a failure: let callers recognise and ignore it. (Checking the signal is
    // more reliable than `instanceof DOMException`, which differs between realms.)
    if (signal?.aborted) throw error;
    throw new ApiError(0);
  }
}

// Their 401 is the answer itself (wrong credentials, dead refresh token), not an expired access
// token. /api/auth/me is not one of them: restoring a session must survive the access token.
const NO_REFRESH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
]);

let refreshing: Promise<void> | null = null;

/** Concurrent 401s share a single refresh request. */
function refreshSession(): Promise<void> {
  refreshing ??= send('/api/auth/refresh', { method: 'POST' })
    .then(({ response }) => {
      if (!response.ok) throw new ApiError(401);
    })
    .catch((error: unknown) => {
      // Server unreachable: the session may still be valid, do not log the user out.
      if (error instanceof ApiError && error.status === 0) throw error;
      for (const listener of sessionExpiredListeners) listener();
      throw new ApiError(401);
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function toApiError(response: Response): Promise<ApiError> {
  // Other statuses carry technical server messages (ids, class names): show ours instead.
  if (response.status !== 400 && response.status !== 401) return new ApiError(response.status);
  const body: unknown = await response.json().catch(() => null);
  const message = isRecord(body) && typeof body.message === 'string' ? body.message : undefined;
  return new ApiError(response.status, message);
}

// The free-tier backend sleeps when idle and takes up to a minute to wake up. Only requests
// slower than this are reported, so that a normal response never makes the overlay flash.
export const SLOW_REQUEST_DELAY_MS = 2000;

let slowRequestCount = 0;
const slowRequestListeners = new Set<() => void>();

function setSlowRequestCount(count: number) {
  slowRequestCount = count;
  for (const listener of slowRequestListeners) listener();
}

/** Number of requests pending for more than SLOW_REQUEST_DELAY_MS. */
export function getSlowRequestCount(): number {
  return slowRequestCount;
}

/** Shaped for useSyncExternalStore. Returns an unsubscribe function. */
export function subscribeToSlowRequests(listener: () => void): () => void {
  slowRequestListeners.add(listener);
  return () => slowRequestListeners.delete(listener);
}

/**
 * Sends a request to the API with the session cookies and the CSRF token, and returns the
 * parsed JSON body (undefined when there is none). Validating its shape is up to the caller.
 */
export async function apiFetch(path: string, options: RequestOptions = {}): Promise<unknown> {
  let isSlow = false;
  const timer = setTimeout(() => {
    isSlow = true;
    setSlowRequestCount(slowRequestCount + 1);
  }, SLOW_REQUEST_DELAY_MS);
  try {
    return await request(path, options);
  } finally {
    clearTimeout(timer);
    if (isSlow) setSlowRequestCount(slowRequestCount - 1);
  }
}

async function request(path: string, options: RequestOptions): Promise<unknown> {
  const method = options.method ?? 'GET';
  let { response, xsrfToken } = await send(path, options);

  // Expired access token: refresh once, then replay.
  if (response.status === 401 && !NO_REFRESH_PATHS.has(path)) {
    await refreshSession();
    ({ response, xsrfToken } = await send(path, options));
  }

  // A rejected request renews the CSRF cookie: replay once if the token actually changed.
  if (response.status === 403 && MUTATING_METHODS.has(method)) {
    const currentToken = getXsrfToken();
    if (currentToken && currentToken !== xsrfToken) ({ response } = await send(path, options));
  }

  if (!response.ok) throw await toApiError(response);
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

/** For API modules: the server answered, but not with the expected shape. */
export function unexpectedResponse(): ApiError {
  return new ApiError(502, 'Réponse inattendue du serveur.');
}
