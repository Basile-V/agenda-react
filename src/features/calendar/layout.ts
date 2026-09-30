import { parseTimeToMinutes } from './time';

export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 21;

const DAY_START = DAY_START_HOUR * 60;
const DAY_END = DAY_END_HOUR * 60;

type Schedulable = { id: number; start: string; duration: number };

export type PositionedEvent<T extends Schedulable> = {
  event: T;
  /** In pixels, relative to the events area. */
  top: number;
  height: number;
  left: number;
  width: number;
};

type Slot<T> = { event: T; start: number; end: number; column: number };

/** Whether any part of the event falls inside the grid: the others are not laid out. */
export function isInDisplayedRange({ start, duration }: Omit<Schedulable, 'id'>): boolean {
  const startMinutes = parseTimeToMinutes(start);
  return startMinutes < DAY_END && startMinutes + duration > DAY_START;
}

/**
 * Positions the events of a day inside a `width` × `height` area covering DAY_START → DAY_END.
 *
 * Events that overlap, directly or through a chain, form a group. Every event of a group gets
 * the same width, `width / columns` (kata rule 1), where `columns` is the largest number of
 * simultaneous events: two overlapping events thus fill the width together (rule 3). Events are
 * not stretched over free columns, as that would give overlapping events different widths.
 */
export function layoutEvents<T extends Schedulable>(
  events: readonly T[],
  { width, height }: { width: number; height: number },
): PositionedEvent<T>[] {
  const pxPerMinute = height / (DAY_END - DAY_START);

  const visible = events
    .filter(isInDisplayedRange)
    .map((event) => {
      const start = parseTimeToMinutes(event.start);
      return { event, start, end: start + event.duration };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end || a.event.id - b.event.id);

  const result: PositionedEvent<T>[] = [];
  let group: Slot<T>[] = [];
  let columnEnds: number[] = [];

  const flushGroup = () => {
    const columnWidth = width / columnEnds.length;
    for (const { event, start, end, column } of group) {
      const top = Math.max(start, DAY_START) - DAY_START;
      const bottom = Math.min(end, DAY_END) - DAY_START;
      result.push({
        event,
        top: top * pxPerMinute,
        height: (bottom - top) * pxPerMinute,
        left: column * columnWidth,
        width: columnWidth,
      });
    }
    group = [];
    columnEnds = [];
  };

  for (const item of visible) {
    // Sorted by start: once it starts after every column ended, the group is complete.
    if (columnEnds.length > 0 && columnEnds.every((end) => end <= item.start)) flushGroup();
    // Greedy: first column already free, otherwise a new one. Optimal for intervals sorted by start.
    let column = columnEnds.findIndex((end) => end <= item.start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = item.end;
    group.push({ ...item, column });
  }
  if (group.length > 0) flushGroup();

  return result;
}
