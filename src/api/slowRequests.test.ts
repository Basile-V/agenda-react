import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiUrl } from '../test/handlers';
import { server } from '../test/server';
import {
  SLOW_REQUEST_DELAY_MS,
  apiFetch,
  getSlowRequestCount,
  subscribeToSlowRequests,
} from './client';

beforeEach(() => {
  // Strict fake clock: advancing with real time would make the 2s threshold racy under load.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

/** Answers `path` only once `respond()` is called. */
function hold(path: string) {
  let respond: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => (respond = resolve));
  server.use(http.get(apiUrl(path), () => response));
  return (answer: Response = HttpResponse.json({ ok: true })) => respond(answer);
}

describe('slow requests', () => {
  test('are counted once pending for more than 2 seconds, until they settle', async () => {
    const respond = hold('/api/slow');
    const request = apiFetch('/api/slow');

    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS - 1);
    expect(getSlowRequestCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(getSlowRequestCount()).toBe(1);

    respond();
    await request;
    expect(getSlowRequestCount()).toBe(0);
  });

  test('a fast request is never counted, so the overlay never flashes', async () => {
    server.use(http.get(apiUrl('/api/fast'), () => HttpResponse.json({})));
    const listener = vi.fn();
    const unsubscribe = subscribeToSlowRequests(listener);

    await apiFetch('/api/fast');
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS * 2);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('concurrent slow requests are counted separately', async () => {
    const respondA = hold('/api/a');
    const respondB = hold('/api/b');
    const a = apiFetch('/api/a');
    const b = apiFetch('/api/b');

    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS);
    expect(getSlowRequestCount()).toBe(2);
    respondA();
    await a;
    expect(getSlowRequestCount()).toBe(1);
    respondB();
    await b;
    expect(getSlowRequestCount()).toBe(0);
  });

  test('a failed request is uncounted too', async () => {
    const respond = hold('/api/slow');
    const request = apiFetch('/api/slow');
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS);
    expect(getSlowRequestCount()).toBe(1);

    respond(new HttpResponse(null, { status: 500 }));
    await expect(request).rejects.toMatchObject({ status: 500 });
    expect(getSlowRequestCount()).toBe(0);
  });

  test('an aborted request is uncounted too', async () => {
    hold('/api/slow');
    const controller = new AbortController();
    const request = apiFetch('/api/slow', { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS);
    expect(getSlowRequestCount()).toBe(1);

    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(getSlowRequestCount()).toBe(0);
  });

  test('notifies subscribers of every change', async () => {
    const respond = hold('/api/slow');
    const counts: number[] = [];
    const unsubscribe = subscribeToSlowRequests(() => counts.push(getSlowRequestCount()));

    const request = apiFetch('/api/slow');
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS);
    respond();
    await request;

    expect(counts).toEqual([1, 0]);
    unsubscribe();
  });
});
