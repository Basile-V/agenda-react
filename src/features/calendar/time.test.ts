import { describe, expect, test } from 'vitest';
import {
  addDays,
  formatDayTitle,
  formatTime,
  fromDateKey,
  isValidDateKey,
  parseTimeToMinutes,
  toDateKey,
} from './time';

describe('parseTimeToMinutes', () => {
  test.each([
    ['00:00', 0],
    ['09:00', 540],
    ['12:30', 750],
    ['21:00', 1260],
    ['23:59', 1439],
  ])('%s → %i', (time, minutes) => {
    expect(parseTimeToMinutes(time)).toBe(minutes);
  });

  test.each(['', '9:00', '12h30', '24:00', '12:60', '12:30:00', 'ab:cd'])('rejects %j', (time) => {
    expect(() => parseTimeToMinutes(time)).toThrow(RangeError);
  });
});

describe('toDateKey', () => {
  test('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  test('ignores the time of day', () => {
    expect(toDateKey(new Date(2026, 8, 29, 23, 59))).toBe('2026-09-29');
    expect(toDateKey(new Date(2026, 8, 29, 0, 0))).toBe('2026-09-29');
  });
});

describe('fromDateKey', () => {
  test('returns local midnight of that day', () => {
    const date = fromDateKey('2026-09-29');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(29);
    expect(date.getHours()).toBe(0);
  });

  test('round-trips with toDateKey', () => {
    expect(toDateKey(fromDateKey('2024-02-29'))).toBe('2024-02-29');
  });

  test('rejects an invalid key', () => {
    expect(() => fromDateKey('2026-02-30')).toThrow(RangeError);
  });
});

describe('isValidDateKey', () => {
  test.each(['2026-09-29', '2024-02-29', '2000-02-29', '1999-12-31'])('accepts %s', (key) => {
    expect(isValidDateKey(key)).toBe(true);
  });

  test.each([
    '',
    'today',
    '2026-9-29',
    '2026/09/29',
    '2026-13-01',
    '2026-00-10',
    '2026-02-30',
    '2025-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-09-29T00:00',
  ])('rejects %j', (key) => {
    expect(isValidDateKey(key)).toBe(false);
  });
});

describe('addDays', () => {
  test.each([
    ['2026-09-29', 1, '2026-09-30'],
    ['2026-09-29', -1, '2026-09-28'],
    ['2026-09-30', 1, '2026-10-01'],
    ['2026-10-01', -1, '2026-09-30'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2025-02-28', 1, '2025-03-01'],
    ['2026-09-29', 0, '2026-09-29'],
    ['2026-09-29', 7, '2026-10-06'],
  ])('%s %+i day(s) → %s', (key, days, expected) => {
    expect(addDays(key, days)).toBe(expected);
  });

  test('crosses daylight saving time changes without skipping a day', () => {
    // Europe switches on the last Sunday of March and October.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
});

describe('formatDayTitle', () => {
  test('long French date, weekday first', () => {
    expect(formatDayTitle('2026-09-29')).toBe('mardi 29 septembre 2026');
    expect(formatDayTitle('2027-01-01')).toBe('vendredi 1 janvier 2027');
  });
});

describe('formatTime', () => {
  test.each([
    [0, '00:00'],
    [540, '09:00'],
    [605, '10:05'],
    [1439, '23:59'],
    [1440, '00:00'],
    [1500, '01:00'],
  ])('%i → %s', (minutes, time) => {
    expect(formatTime(minutes)).toBe(time);
  });

  test('is the inverse of parseTimeToMinutes', () => {
    expect(formatTime(parseTimeToMinutes('17:45'))).toBe('17:45');
  });
});
