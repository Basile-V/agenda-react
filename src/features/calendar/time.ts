import type { Locale } from '../../i18n/locale';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'HH:MM' → minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new RangeError(`Invalid time: "${time}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Local date → 'YYYY-MM-DD' (not toISOString, which would shift to UTC). */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateKey(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // Date silently rolls over (Feb 30 → Mar 2): a round trip detects it.
  return toDateKey(date) === key ? date : null;
}

export function isValidDateKey(key: string): boolean {
  return parseDateKey(key) !== null;
}

/** 'YYYY-MM-DD' → local midnight of that day. */
export function fromDateKey(key: string): Date {
  const date = parseDateKey(key);
  if (!date) throw new RangeError(`Invalid date key: "${key}"`);
  return date;
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  // Calendar arithmetic rather than adding 24h, which breaks on DST changes.
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

const DAY_TITLE_OPTIONS = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
} as const;

// British English: day before month and a 24-hour clock, like the rest of the interface.
const dayTitleFormats: Record<Locale, Intl.DateTimeFormat> = {
  fr: new Intl.DateTimeFormat('fr-FR', DAY_TITLE_OPTIONS),
  en: new Intl.DateTimeFormat('en-GB', DAY_TITLE_OPTIONS),
};

/** '2026-09-29' → 'mardi 29 septembre 2026' or 'Tuesday 29 September 2026' */
export function formatDayTitle(key: string, locale: Locale): string {
  return dayTitleFormats[locale].format(fromDateKey(key));
}

/** Minutes since midnight → 'HH:MM', wrapping past midnight. */
export function formatTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(wrapped / 60)).padStart(2, '0');
  return `${hours}:${String(wrapped % 60).padStart(2, '0')}`;
}
