import type { CalendarEvent } from '../../api/types';

export type EventChange<T extends CalendarEvent = CalendarEvent> =
  { type: 'added'; event: T } | { type: 'updated'; event: T } | { type: 'removed'; id: number };

/**
 * Applies a change to the events of the displayed `date`. Shared by the optimistic state and
 * the confirmed one, so both follow the same rules (an event moved to another day leaves).
 */
export function applyEventChange<T extends CalendarEvent>(
  events: readonly T[],
  change: EventChange<T>,
  date: string,
): readonly T[] {
  switch (change.type) {
    case 'added':
      return change.event.date === date ? [...events, change.event] : events;
    case 'updated':
      return change.event.date === date
        ? events.map((event) => (event.id === change.event.id ? change.event : event))
        : events.filter((event) => event.id !== change.event.id);
    case 'removed':
      return events.filter((event) => event.id !== change.id);
  }
}
