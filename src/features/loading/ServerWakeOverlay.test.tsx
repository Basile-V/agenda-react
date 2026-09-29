import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SLOW_REQUEST_DELAY_MS, apiFetch } from '../../api/client';
import { apiUrl } from '../../test/handlers';
import { server } from '../../test/server';
import { ServerWakeOverlay } from './ServerWakeOverlay';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

test('shows while a request is slow, then goes away', async () => {
  let respond = () => {};
  const answered = new Promise<void>((resolve) => (respond = resolve));
  server.use(
    http.get(apiUrl('/api/slow'), async () => {
      await answered;
      return HttpResponse.json({});
    }),
  );
  render(<ServerWakeOverlay />);
  const request = apiFetch('/api/slow');

  await act(() => vi.advanceTimersByTimeAsync(SLOW_REQUEST_DELAY_MS - 1));
  expect(screen.queryByText('Le serveur se réveille…')).toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(screen.getByRole('status')).toHaveTextContent('Le serveur se réveille…');

  respond();
  await act(() => request);
  expect(screen.queryByRole('status')).toBeNull();
});
