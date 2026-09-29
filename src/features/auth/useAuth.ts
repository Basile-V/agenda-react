import { use } from 'react';
import { AuthContext } from './authContext';

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used within <AuthProvider>');
  return auth;
}
