import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { BASILE, db, resetDb } from '../test/db';
import { apiUrl } from '../test/handlers';
import { server } from '../test/server';
import { createEvent, deleteEvent, getEvents, updateEvent } from './events';

const DAY = '2026-09-29';

// Runs against the shared mock backend, which enforces sessions and CSRF like the real one.
beforeEach(() => {
  resetDb({ date: DAY });
  db.sessionUserId = BASILE.id;
});

describe('getEvents', () => {
  test('returns own events and public events of others', async () => {
    const events = await getEvents(DAY);
    expect(events.map((e) => e.id)).toEqual([1, 2, 3, 4]);
  });

  test('returns nothing for another day', async () => {
    await expect(getEvents('2026-09-30')).resolves.toEqual([]);
  });

  test('drops a null title', async () => {
    server.use(
      http.get(apiUrl('/api/events'), () =>
        HttpResponse.json([
          {
            id: 9,
            title: null,
            date: DAY,
            start: '10:00',
            duration: 30,
            ownerId: 2,
            isPublic: false,
          },
        ]),
      ),
    );
    const [event] = await getEvents(DAY);
    expect(event).toEqual({
      id: 9,
      date: DAY,
      start: '10:00',
      duration: 30,
      ownerId: 2,
      isPublic: false,
    });
  });

  test.each([
    ['not an array', { events: [] }],
    ['missing field', [{ id: 1, date: DAY, start: '10:00', ownerId: 2, isPublic: false }]],
    [
      'wrong time format',
      [{ id: 1, date: DAY, start: '10:00:00', duration: 30, ownerId: 2, isPublic: false }],
    ],
    [
      'impossible time',
      [{ id: 1, date: DAY, start: '24:00', duration: 30, ownerId: 2, isPublic: false }],
    ],
    [
      'empty duration',
      [{ id: 1, date: DAY, start: '10:00', duration: 0, ownerId: 2, isPublic: false }],
    ],
    [
      'fractional duration',
      [{ id: 1, date: DAY, start: '10:00', duration: 30.5, ownerId: 2, isPublic: false }],
    ],
  ])('rejects an unexpected response (%s)', async (_, body) => {
    server.use(http.get(apiUrl('/api/events'), () => HttpResponse.json(body)));
    await expect(getEvents(DAY)).rejects.toMatchObject({
      status: 502,
      message: 'Réponse inattendue du serveur.',
    });
  });

  test('passes the abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(getEvents(DAY, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('mutations (CSRF token obtained on the fly)', () => {
  const payload = { title: 'Atelier', date: DAY, start: '15:00', duration: 45, isPublic: true };

  test('createEvent returns the created event', async () => {
    const event = await createEvent(payload);
    expect(event).toEqual({ id: 6, ownerId: BASILE.id, ...payload });
    expect(db.events).toContainEqual(event);
  });

  test('updateEvent returns the updated event', async () => {
    const event = await updateEvent(1, { ...payload, title: 'Renommé' });
    expect(event).toMatchObject({ id: 1, title: 'Renommé', start: '15:00' });
  });

  test("updateEvent on someone else's event is refused", async () => {
    await expect(updateEvent(4, payload)).rejects.toMatchObject({ status: 403 });
  });

  test('deleteEvent removes the event', async () => {
    await expect(deleteEvent(1)).resolves.toBeUndefined();
    expect(db.events.some((e) => e.id === 1)).toBe(false);
  });

  test('deleteEvent on an unknown event is a 404', async () => {
    await expect(deleteEvent(999)).rejects.toMatchObject({
      status: 404,
      message: "Cet élément n'existe plus.",
    });
  });
});
