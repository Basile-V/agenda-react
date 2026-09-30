import { startTransition, useEffect, useOptimistic, useReducer } from 'react';
import { ApiError } from '../../api/client';
import { createEvent, deleteEvent, getEvents, updateEvent } from '../../api/events';
import type { CalendarEvent, EventPayload } from '../../api/types';
import { getMessages } from '../../i18n/messages';
import { applyEventChange, type EventChange } from './eventChanges';

/** An event as displayed: `pending` while its change awaits the server's confirmation. */
export type DisplayedEvent = CalendarEvent & { pending?: true };

/** Each result remembers which request it answers, so a stale one is never shown. */
type Result = { date: string; attempt: number } & (
  { status: 'success'; events: readonly CalendarEvent[] } | { status: 'error'; message: string }
);

type State = { attempt: number; result: Result | null };

type Action =
  | { type: 'settled'; result: Result }
  | { type: 'retry' }
  | { type: 'changed'; change: EventChange };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'settled':
      return { ...state, result: action.result };
    case 'retry':
      return { ...state, attempt: state.attempt + 1 };
    case 'changed': {
      const { result } = state;
      if (result?.status !== 'success') return state;
      const events = applyEventChange(result.events, action.change, result.date);
      return { ...state, result: { ...result, events } };
    }
  }
}

function toMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

// Optimistic events need an id until the server assigns one; negative ones never collide.
let nextTemporaryId = -1;

/**
 * Events of `date`, and optimistic mutations on them. Changing the date cancels the pending
 * request; while the matching response has not arrived, the status is 'loading'.
 *
 * Mutations reject with a user-readable Error when the server refuses them; their optimistic
 * change is then rolled back on its own, when the transition ends.
 */
export function useDayEvents(date: string) {
  const [{ attempt, result }, dispatch] = useReducer(reducer, { attempt: 0, result: null });

  useEffect(() => {
    const controller = new AbortController();
    getEvents(date, controller.signal).then(
      (events) =>
        dispatch({ type: 'settled', result: { date, attempt, status: 'success', events } }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = toMessage(error, getMessages().calendar.loadFailed);
        dispatch({ type: 'settled', result: { date, attempt, status: 'error', message } });
      },
    );
    return () => controller.abort();
  }, [date, attempt]);

  const isCurrent = result?.date === date && result.attempt === attempt;
  const confirmedEvents: readonly DisplayedEvent[] =
    isCurrent && result.status === 'success' ? result.events : [];
  const [optimisticEvents, applyOptimistic] = useOptimistic(
    confirmedEvents,
    (events, change: EventChange<DisplayedEvent>) => applyEventChange(events, change, date),
  );

  function mutate(optimistic: EventChange<DisplayedEvent>, request: () => Promise<EventChange>) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        applyOptimistic(optimistic);
        try {
          const confirmed = await request();
          // After an await, updates must be wrapped again to belong to the transition: the
          // optimistic event and the confirmed one are then swapped in the same render.
          startTransition(() => dispatch({ type: 'changed', change: confirmed }));
          resolve();
        } catch (error) {
          reject(new Error(toMessage(error, getMessages().common.genericError)));
        }
      });
    });
  }

  const actions = {
    retry: () => dispatch({ type: 'retry' }),

    create: (payload: EventPayload, ownerId: number) =>
      mutate(
        { type: 'added', event: { ...payload, id: nextTemporaryId--, ownerId, pending: true } },
        async () => ({ type: 'added', event: await createEvent(payload) }),
      ),

    update: (event: CalendarEvent, payload: EventPayload) =>
      mutate({ type: 'updated', event: { ...event, ...payload, pending: true } }, async () => ({
        type: 'updated',
        event: await updateEvent(event.id, payload),
      })),

    remove: (id: number) =>
      mutate({ type: 'removed', id }, async () => {
        await deleteEvent(id);
        return { type: 'removed', id };
      }),
  };

  // Derived during render rather than reset in the effect: no flash of the previous day.
  if (!isCurrent) return { status: 'loading', ...actions } as const;
  if (result.status === 'error')
    return { status: 'error', message: result.message, ...actions } as const;
  return { status: 'success', events: optimisticEvents, ...actions } as const;
}
