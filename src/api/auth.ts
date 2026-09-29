import { apiFetch, isRecord, unexpectedResponse } from './client';
import type { Credentials, Registration, User } from './types';

function parseUser(data: unknown): User {
  if (
    isRecord(data) &&
    typeof data.id === 'number' &&
    typeof data.username === 'string' &&
    typeof data.displayName === 'string' &&
    (data.role === 'ADMIN' || data.role === 'USER')
  ) {
    return { id: data.id, username: data.username, displayName: data.displayName, role: data.role };
  }
  throw unexpectedResponse();
}

export async function login(credentials: Credentials): Promise<User> {
  return parseUser(await apiFetch('/api/auth/login', { method: 'POST', body: credentials }));
}

export async function register(registration: Registration): Promise<User> {
  return parseUser(await apiFetch('/api/auth/register', { method: 'POST', body: registration }));
}

/** Current user from the session cookies; rejects with a 401 ApiError when logged out. */
export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  return parseUser(await apiFetch('/api/auth/me', { signal }));
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}
