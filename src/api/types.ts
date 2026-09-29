// Named CalendarEvent rather than Event so as not to shadow the DOM Event type.
export type CalendarEvent = {
  id: number;
  title?: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:MM' */
  start: string;
  /** In minutes. */
  duration: number;
  ownerId: number;
  isPublic: boolean;
};

/** Body of POST and PUT /api/events. */
export type EventPayload = Omit<CalendarEvent, 'id' | 'ownerId'>;

export type User = {
  id: number;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
};

export type Credentials = { username: string; password: string };

export type Registration = Credentials & { displayName: string };
