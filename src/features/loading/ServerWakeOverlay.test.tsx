import { act, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SLOW_REQUEST_DELAY_MS, apiFetch } from '../../api/client';
import { apiUrl } from '../../test/handlers';
import { server } from '../../test/server';
import { ServerWakeOverlay } from './ServerWakeOverlay';

beforeEach(() => {
  // Strict fake clock: advancing with real time would make the 2s threshold racy under load.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
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
  expect(screen.queryByRole('dialog')).toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(1));
  const dialog = screen.getByRole('dialog', { name: 'Le serveur se réveille…' });
  expect(dialog).toHaveTextContent("jusqu'à quelques minutes");

  // A blocking wait: Escape does not dismiss it.
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  respond();
  await act(() => request);
  expect(screen.queryByRole('dialog')).toBeNull();
});
