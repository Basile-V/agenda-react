import { apiFetch, isRecord, unexpectedResponse } from './client';
import type { CalendarEvent, EventPayload } from './types';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
// As strict as the calendar, which throws on a time it cannot place.
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseEvent(data: unknown): CalendarEvent {
  if (
    isRecord(data) &&
    typeof data.id === 'number' &&
    (data.title == null || typeof data.title === 'string') &&
    typeof data.date === 'string' &&
    DATE_FORMAT.test(data.date) &&
    typeof data.start === 'string' &&
    TIME_FORMAT.test(data.start) &&
    typeof data.duration === 'number' &&
    Number.isInteger(data.duration) &&
    data.duration > 0 &&
    typeof data.ownerId === 'number' &&
    typeof data.isPublic === 'boolean'
  ) {
    return {
      id: data.id,
      // The backend sends null for an untitled event.
      ...(typeof data.title === 'string' && data.title ? { title: data.title } : {}),
      date: data.date,
      start: data.start,
      duration: data.duration,
      ownerId: data.ownerId,
      isPublic: data.isPublic,
    };
  }
  throw unexpectedResponse();
}

export async function getEvents(date: string, signal?: AbortSignal): Promise<CalendarEvent[]> {
  const data = await apiFetch(`/api/events?date=${encodeURIComponent(date)}`, { signal });
  if (!Array.isArray(data)) throw unexpectedResponse();
  return data.map(parseEvent);
}

export async function createEvent(payload: EventPayload): Promise<CalendarEvent> {
  return parseEvent(await apiFetch('/api/events', { method: 'POST', body: payload }));
}

export async function updateEvent(id: number, payload: EventPayload): Promise<CalendarEvent> {
  return parseEvent(await apiFetch(`/api/events/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteEvent(id: number): Promise<void> {
  await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
}
