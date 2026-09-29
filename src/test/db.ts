import type { CalendarEvent, User } from '../api/types';
import { toDateKey } from '../features/calendar/time';

type MockUser = User & { password: string };

type MockDb = {
  users: MockUser[];
  events: CalendarEvent[];
  /** Logged-in user, standing in for the httpOnly session cookies. */
  sessionUserId: number | null;
  nextId: number;
};

/** In-memory state of the mock backend, shared by the tests and `npm run dev:mock`. */
export const db: MockDb = { users: [], events: [], sessionUserId: null, nextId: 1 };

export const ADMIN = { id: 1, username: 'admin', displayName: 'Admin', role: 'ADMIN' } as const;
export const BASILE = { id: 2, username: 'basile', displayName: 'Basile', role: 'USER' } as const;
export const DEMO_PASSWORD = 'demo1234';

export function resetDb({ date = toDateKey(new Date()) }: { date?: string } = {}) {
  db.users = [ADMIN, BASILE].map((user) => ({ ...user, password: DEMO_PASSWORD }));
  db.events = [
    {
      id: 1,
      title: 'Point équipe',
      date,
      start: '09:30',
      duration: 30,
      ownerId: 2,
      isPublic: false,
    },
    {
      id: 2,
      title: 'Revue de code',
      date,
      start: '09:45',
      duration: 60,
      ownerId: 2,
      isPublic: true,
    },
    { id: 3, title: 'Déjeuner', date, start: '12:30', duration: 60, ownerId: 2, isPublic: false },
    { id: 4, title: 'Démo client', date, start: '14:00', duration: 90, ownerId: 1, isPublic: true },
    { id: 5, title: 'Sport', date, start: '18:00', duration: 60, ownerId: 1, isPublic: false },
  ];
  db.sessionUserId = null;
  db.nextId = 6;
}

export function withoutPassword({ password, ...user }: MockUser): User {
  return user;
}
