import { createContext } from 'react';
import type { Credentials, Registration, User } from '../../api/types';

export type Session =
  { status: 'restoring' } | { status: 'authenticated'; user: User } | { status: 'anonymous' };

export type AuthContextValue = {
  session: Session;
  /** Reject with an ApiError; the session is updated on success. */
  login: (credentials: Credentials) => Promise<void>;
  register: (registration: Registration) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
