import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../../api/auth';
import { onSessionExpired } from '../../api/client';
import { AuthContext, type AuthContextValue, type Session } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'restoring' });

  // Restore the session from the cookies once, for every route that needs it.
  useEffect(() => {
    const controller = new AbortController();
    authApi.getCurrentUser(controller.signal).then(
      (user) => setSession({ status: 'authenticated', user }),
      () => {
        if (!controller.signal.aborted) setSession({ status: 'anonymous' });
      },
    );
    return () => controller.abort();
  }, []);

  useEffect(() => onSessionExpired(() => setSession({ status: 'anonymous' })), []);

  // Memoized: every consumer re-renders when the context value changes identity.
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
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
