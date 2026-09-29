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
