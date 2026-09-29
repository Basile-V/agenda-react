import { use } from 'react';
import { AuthContext } from './authContext';

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used within <AuthProvider>');
  return auth;
}

/** The logged-in user, for components rendered behind <RequireAuth>. */
export function useCurrentUser() {
  const { session } = useAuth();
  if (session.status !== 'authenticated') {
    throw new Error('useCurrentUser must be used behind <RequireAuth>');
  }
  return session.user;
}
