import { useEffect, useReducer } from 'react';
import { ApiError } from '../../api/client';
import { getEvents } from '../../api/events';
import type { CalendarEvent } from '../../api/types';

export type DayEvents =
  | { status: 'loading' }
  | { status: 'success'; events: CalendarEvent[] }
  | { status: 'error'; message: string };

/** Each result remembers which request it answers, so a stale one is never shown. */
type Result = { date: string; attempt: number } & (
  { status: 'success'; events: CalendarEvent[] } | { status: 'error'; message: string }
);

type State = { attempt: number; result: Result | null };

type Action = { type: 'settled'; result: Result } | { type: 'retry' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'settled':
      return { ...state, result: action.result };
    case 'retry':
      return { ...state, attempt: state.attempt + 1 };
  }
}

/**
 * Events of `date`. Changing the date cancels the pending request; while the matching
 * response has not arrived, the status is 'loading'.
 */
export function useDayEvents(date: string): DayEvents & { retry: () => void } {
  const [{ attempt, result }, dispatch] = useReducer(reducer, { attempt: 0, result: null });

  useEffect(() => {
    const controller = new AbortController();
    getEvents(date, controller.signal).then(
      (events) =>
        dispatch({ type: 'settled', result: { date, attempt, status: 'success', events } }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError ? error.message : 'Impossible de charger les événements.';
        dispatch({ type: 'settled', result: { date, attempt, status: 'error', message } });
      },
    );
    return () => controller.abort();
  }, [date, attempt]);

  const retry = () => dispatch({ type: 'retry' });

  // Derived during render rather than reset in the effect: no flash of the previous day.
  if (!result || result.date !== date || result.attempt !== attempt) {
    return { status: 'loading', retry };
  }
  return result.status === 'success'
    ? { status: 'success', events: result.events, retry }
    : { status: 'error', message: result.message, retry };
}
