import { describe, expect, test } from 'vitest';
import type { CalendarEvent } from '../../api/types';
import { applyEventChange } from './eventChanges';

const DAY = '2026-09-29';

function ev(id: number, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id,
    title: `E${id}`,
    date: DAY,
    start: '10:00',
    duration: 30,
    ownerId: 1,
    isPublic: false,
    ...overrides,
  };
}

const events = [ev(1), ev(2), ev(3)];

describe('added', () => {
  test('appends an event of the displayed day', () => {
    expect(applyEventChange(events, { type: 'added', event: ev(4) }, DAY)).toEqual([
      ...events,
      ev(4),
    ]);
  });

  test('ignores an event created on another day', () => {
    expect(
      applyEventChange(events, { type: 'added', event: ev(4, { date: '2026-09-30' }) }, DAY),
    ).toBe(events);
  });
});

describe('updated', () => {
  test('replaces the event in place when it stays on the displayed day', () => {
    const updated = ev(2, { title: 'Renommé', start: '15:00' });
    expect(applyEventChange(events, { type: 'updated', event: updated }, DAY)).toEqual([
      ev(1),
      updated,
      ev(3),
    ]);
  });

  test('removes the event when it moves to another day', () => {
    const moved = ev(2, { date: '2026-10-01' });
    expect(applyEventChange(events, { type: 'updated', event: moved }, DAY)).toEqual([
      ev(1),
      ev(3),
    ]);
  });
});

describe('removed', () => {
  test('removes the event', () => {
    expect(applyEventChange(events, { type: 'removed', id: 1 }, DAY)).toEqual([ev(2), ev(3)]);
  });

  test('an unknown id changes nothing', () => {
    expect(applyEventChange(events, { type: 'removed', id: 99 }, DAY)).toEqual(events);
  });
});

test('never mutates its input', () => {
  const frozen = Object.freeze([...events]);
  applyEventChange(frozen, { type: 'added', event: ev(4) }, DAY);
  applyEventChange(frozen, { type: 'updated', event: ev(1, { title: 'x' }) }, DAY);
  applyEventChange(frozen, { type: 'removed', id: 1 }, DAY);
  expect(frozen).toEqual(events);
});
