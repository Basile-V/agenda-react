import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../../api/auth';
import { ApiError, onSessionExpired } from '../../api/client';
import { AuthContext, type AuthContextValue, type Session } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'restoring' });
  const [attempt, setAttempt] = useState(0);

  // Restore the session from the cookies once, for every route that needs it.
  useEffect(() => {
    const controller = new AbortController();
    authApi.getCurrentUser(controller.signal).then(
      (user) => setSession({ status: 'authenticated', user }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        // Only a 401 says "logged out". A sleeping or unreachable server says nothing about
        // the cookies: sending the user to /login would make them log in again for nothing.
        const isLoggedOut = error instanceof ApiError && error.status === 401;
        setSession({ status: isLoggedOut ? 'anonymous' : 'unavailable' });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => onSessionExpired(() => setSession({ status: 'anonymous' })), []);

  // Memoized: every consumer re-renders when the context value changes identity.
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      retry: () => {
        setSession({ status: 'restoring' });
        setAttempt((current) => current + 1);
      },
      login: async (credentials) => {
        setSession({ status: 'authenticated', user: await authApi.login(credentials) });
      },
      register: async (registration) => {
        setSession({ status: 'authenticated', user: await authApi.register(registration) });
      },
      logout: async () => {
        // The user asked to leave: the app logs out even if the server did not hear it.
        // Its cookies then outlive this page (a reload would restore the session).
        await authApi.logout().catch(() => {});
        setSession({ status: 'anonymous' });
      },
    }),
    [session],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
