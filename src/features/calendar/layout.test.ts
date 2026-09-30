import { describe, expect, test } from 'vitest';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  isInDisplayedRange,
  layoutEvents,
  type PositionedEvent,
} from './layout';

type TestEvent = { id: number; start: string; duration: number };

// 09:00 → 21:00 on 1200px: 100px per hour, as in the kata statement.
const GRID = { width: 600, height: 1200 };

function ev(id: number, start: string, duration: number): TestEvent {
  return { id, start, duration };
}

function byId(layout: PositionedEvent<TestEvent>[]) {
  return new Map(layout.map((item) => [item.event.id, item]));
}

function box(layout: PositionedEvent<TestEvent>[], id: number) {
  const item = byId(layout).get(id);
  if (!item) throw new Error(`event ${id} missing from layout`);
  const { top, height, left, width } = item;
  return { top, height, left, width };
}

function overlaps(a: TestEvent, b: TestEvent) {
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const aStart = minutes(a.start);
  const bStart = minutes(b.start);
  return aStart < bStart + b.duration && bStart < aStart + a.duration;
}

function overlappingPairs(events: TestEvent[]) {
  return events.flatMap((a, i) =>
    events
      .slice(i + 1)
      .filter((b) => overlaps(a, b))
      .map((b) => [a, b] as const),
  );
}

test('the visible range is 09:00 → 21:00', () => {
  expect(DAY_START_HOUR).toBe(9);
  expect(DAY_END_HOUR).toBe(21);
});

test('no events → empty layout', () => {
  expect(layoutEvents([], GRID)).toEqual([]);
});

test('keeps a reference to the original event', () => {
  const event = ev(1, '10:00', 30);
  expect(layoutEvents([event], GRID)[0]?.event).toBe(event);
});

describe('vertical position', () => {
  test('kata example: 12:00 for 1h on 1200px → top 300px, height 100px', () => {
    expect(box(layoutEvents([ev(1, '12:00', 60)], GRID), 1)).toMatchObject({
      top: 300,
      height: 100,
    });
  });

  test('is proportional to the grid height', () => {
    const layout = layoutEvents([ev(1, '12:00', 60)], { width: 600, height: 600 });
    expect(box(layout, 1)).toMatchObject({ top: 150, height: 50 });
  });

  test('an event filling the whole range covers the whole grid', () => {
    expect(box(layoutEvents([ev(1, '09:00', 720)], GRID), 1)).toMatchObject({
      top: 0,
      height: 1200,
    });
  });

  test('handles minutes that are not on the hour', () => {
    expect(box(layoutEvents([ev(1, '09:15', 45)], GRID), 1)).toMatchObject({ top: 25, height: 75 });
  });
});

describe('out-of-range times are clamped to the grid', () => {
  test('starting before 09:00', () => {
    expect(box(layoutEvents([ev(1, '08:00', 120)], GRID), 1)).toMatchObject({
      top: 0,
      height: 100,
    });
  });

  test('ending after 21:00', () => {
    expect(box(layoutEvents([ev(1, '20:00', 180)], GRID), 1)).toMatchObject({
      top: 1100,
      height: 100,
    });
  });

  test('spanning the whole day', () => {
    expect(box(layoutEvents([ev(1, '07:00', 16 * 60)], GRID), 1)).toMatchObject({
      top: 0,
      height: 1200,
    });
  });

  test('entirely outside the range → not laid out', () => {
    const layout = layoutEvents(
      [ev(1, '07:00', 60), ev(2, '08:00', 60), ev(3, '21:00', 30), ev(4, '22:00', 60)],
      GRID,
    );
    expect(layout).toEqual([]);
  });

  test('an event hidden before 09:00 does not steal a column', () => {
    const layout = layoutEvents([ev(1, '07:00', 90), ev(2, '09:00', 60)], GRID);
    expect(layout).toHaveLength(1);
    expect(box(layout, 2)).toMatchObject({ left: 0, width: 600 });
  });
});

describe('isInDisplayedRange', () => {
  test.each([
    ['07:00', 60, false],
    ['08:00', 60, false], // ends exactly when the grid starts
    ['08:30', 60, true],
    ['09:00', 30, true],
    ['20:59', 1, true],
    ['21:00', 30, false], // starts exactly when the grid ends
    ['23:30', 120, false], // past midnight: still not on this day's grid
  ])('%s for %i min → %s', (start, duration, expected) => {
    expect(isInDisplayedRange(ev(1, start, duration))).toBe(expected);
  });

  test('agrees with layoutEvents: an event is laid out if and only if it is in range', () => {
    const events = [ev(1, '07:00', 60), ev(2, '08:30', 60), ev(3, '20:59', 1), ev(4, '21:00', 5)];
    const laidOut = layoutEvents(events, GRID).map(({ event }) => event.id);
    expect(laidOut).toEqual(events.filter(isInDisplayedRange).map((event) => event.id));
  });
});

describe('horizontal position', () => {
  test('a single event takes the full width', () => {
    expect(box(layoutEvents([ev(1, '10:00', 60)], GRID), 1)).toMatchObject({ left: 0, width: 600 });
  });

  test('two overlapping events share the width', () => {
    const layout = layoutEvents([ev(1, '10:00', 60), ev(2, '10:30', 60)], GRID);
    expect(box(layout, 1)).toMatchObject({ left: 0, width: 300 });
    expect(box(layout, 2)).toMatchObject({ left: 300, width: 300 });
  });

  test('identical events share the width, ordered by id', () => {
    const layout = layoutEvents([ev(2, '10:00', 60), ev(1, '10:00', 60)], GRID);
    expect(box(layout, 1)).toMatchObject({ left: 0, width: 300 });
    expect(box(layout, 2)).toMatchObject({ left: 300, width: 300 });
  });

  test('the longest event goes first when starting at the same time', () => {
    const layout = layoutEvents([ev(1, '10:00', 30), ev(2, '10:00', 120)], GRID);
    expect(box(layout, 2)).toMatchObject({ left: 0 });
    expect(box(layout, 1)).toMatchObject({ left: 300 });
  });

  test('three events, two overlapping: the third one keeps the full width', () => {
    const layout = layoutEvents([ev(1, '09:00', 60), ev(2, '09:30', 60), ev(3, '14:00', 60)], GRID);
    expect(box(layout, 1)).toMatchObject({ left: 0, width: 300 });
    expect(box(layout, 2)).toMatchObject({ left: 300, width: 300 });
    expect(box(layout, 3)).toMatchObject({ left: 0, width: 600 });
  });

  test('contiguous events (end = start) do not overlap', () => {
    const layout = layoutEvents([ev(1, '10:00', 60), ev(2, '11:00', 60)], GRID);
    expect(box(layout, 1)).toMatchObject({ left: 0, width: 600, top: 100, height: 100 });
    expect(box(layout, 2)).toMatchObject({ left: 0, width: 600, top: 200, height: 100 });
  });

  test('a freed column is reused', () => {
    // 1 overlaps 2 and 3, which follow each other: two columns are enough.
    const layout = layoutEvents(
      [ev(1, '09:00', 120), ev(2, '09:00', 60), ev(3, '10:00', 60)],
      GRID,
    );
    expect(box(layout, 1)).toMatchObject({ left: 0, width: 300 });
    expect(box(layout, 2)).toMatchObject({ left: 300, width: 300 });
    expect(box(layout, 3)).toMatchObject({ left: 300, width: 300 });
  });

  test('three events overlapping at the same time get a third each', () => {
    const layout = layoutEvents([ev(1, '10:00', 60), ev(2, '10:15', 60), ev(3, '10:30', 60)], GRID);
    expect(layout.map((item) => [item.left, item.width])).toEqual([
      [0, 200],
      [200, 200],
      [400, 200],
    ]);
  });

  test('a chain of overlaps forms a single group of equal widths', () => {
    // 1–2 and 2–3 overlap, 1–3 do not: all three share the same width.
    const layout = layoutEvents([ev(1, '09:00', 60), ev(2, '09:30', 60), ev(3, '10:00', 60)], GRID);
    expect(box(layout, 1)).toMatchObject({ left: 0, width: 300 });
    expect(box(layout, 2)).toMatchObject({ left: 300, width: 300 });
    expect(box(layout, 3)).toMatchObject({ left: 0, width: 300 });
  });

  test('is proportional to the grid width', () => {
    const layout = layoutEvents([ev(1, '10:00', 60), ev(2, '10:30', 60)], {
      width: 375,
      height: 800,
    });
    expect(box(layout, 2)).toMatchObject({ left: 187.5, width: 187.5 });
  });

  test('does not depend on the input order', () => {
    const events = [
      ev(1, '09:00', 120),
      ev(2, '09:30', 60),
      ev(3, '10:00', 90),
      ev(4, '15:00', 30),
    ];
    const sorted = (layout: PositionedEvent<TestEvent>[]) =>
      [...layout]
        .sort((a, b) => a.event.id - b.event.id)
        .map(({ event, ...rest }) => ({ id: event.id, ...rest }));
    expect(sorted(layoutEvents([...events].reverse(), GRID))).toEqual(
      sorted(layoutEvents(events, GRID)),
    );
  });
});

describe('kata rules', () => {
  const scenarios: Record<string, TestEvent[]> = {
    'two overlapping': [ev(1, '10:00', 60), ev(2, '10:30', 60)],
    'overlap chain': [
      ev(1, '09:00', 60),
      ev(2, '09:30', 60),
      ev(3, '10:00', 60),
      ev(4, '10:30', 60),
    ],
    'long event with successive short ones': [
      ev(1, '09:00', 240),
      ev(2, '09:00', 60),
      ev(3, '10:00', 60),
      ev(4, '11:00', 60),
    ],
    'three at once': [ev(1, '10:00', 60), ev(2, '10:15', 60), ev(3, '10:30', 60)],
    'several groups': [
      ev(1, '09:00', 60),
      ev(2, '09:30', 60),
      ev(3, '13:00', 30),
      ev(4, '15:00', 120),
      ev(5, '15:00', 60),
      ev(6, '16:00', 30),
      ev(7, '16:10', 10),
    ],
  };

  describe.each(Object.entries(scenarios))('%s', (_, events) => {
    const layout = layoutEvents(events, GRID);
    const boxes = byId(layout);
    const width = (e: TestEvent) => boxes.get(e.id)?.width ?? Number.NaN;

    test('rule 1: overlapping events have the same width', () => {
      for (const [a, b] of overlappingPairs(events)) expect(width(a)).toBe(width(b));
    });

    test('rule 2: nothing goes beyond the container width (LargeurMax)', () => {
      for (const item of layout) {
        expect(item.left).toBeGreaterThanOrEqual(0);
        expect(item.left + item.width).toBeLessThanOrEqual(GRID.width + 1e-9);
      }
    });

    test('overlapping events never cover each other', () => {
      for (const [a, b] of overlappingPairs(events)) {
        const boxA = boxes.get(a.id);
        const boxB = boxes.get(b.id);
        if (!boxA || !boxB) throw new Error('missing box');
        const apart = boxA.left + boxA.width <= boxB.left || boxB.left + boxB.width <= boxA.left;
        expect(apart).toBe(true);
      }
    });
  });

  test('rule 3: two overlapping events fill the container width together', () => {
    const events = [ev(1, '09:00', 60), ev(2, '09:30', 60), ev(3, '10:00', 60), ev(4, '10:30', 60)];
    const boxes = byId(layoutEvents(events, GRID));
    for (const [a, b] of overlappingPairs(events)) {
      expect((boxes.get(a.id)?.width ?? 0) + (boxes.get(b.id)?.width ?? 0)).toBe(GRID.width);
    }
  });

  test('rule 3 holds even after resizing the container', () => {
    const events = [ev(1, '10:00', 60), ev(2, '10:30', 60)];
    for (const width of [320, 777, 1920]) {
      const [a, b] = layoutEvents(events, { width, height: 1200 });
      expect((a?.width ?? 0) + (b?.width ?? 0)).toBeCloseTo(width);
    }
  });

  test('rule 3 cannot hold with three simultaneous events: rule 1 wins, each gets a third', () => {
    // A + B = LargeurMax and B + C = LargeurMax and A + C = LargeurMax would force
    // A = B = C = LargeurMax / 2, and three halves do not fit side by side.
    const layout = layoutEvents([ev(1, '10:00', 60), ev(2, '10:15', 60), ev(3, '10:30', 60)], GRID);
    for (const item of layout) expect(item.width).toBe(GRID.width / 3);
  });
});
