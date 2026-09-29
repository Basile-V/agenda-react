import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { BASILE, db, resetDb } from '../../test/db';
import { apiUrl } from '../../test/handlers';
import { renderWithRouter } from '../../test/renderWithRouter';
import { resizeTo } from '../../test/resizeObserver';
import { server } from '../../test/server';
import { formatDayTitle, toDateKey } from './time';

const DAY = '2026-09-29';

// Seed for DAY, as seen by Basile (the grid is 600 × 1200px, so 100px per hour):
// #1 09:30 30min and #2 09:45 60min overlap, #3 12:30 60min, #4 14:00 90min (admin, public),
// #5 is a private event of admin: invisible.
beforeEach(() => {
  resetDb({ date: DAY });
  db.sessionUserId = BASILE.id;
});

function eventBlock(id: number) {
  return document.getElementById(`event-${id}`);
}

async function renderDay(date = DAY) {
  const result = renderWithRouter(`/${date}`);
  await screen.findByRole('heading', { level: 1, name: formatDayTitle(date) });
  await waitForEvents();
  return result;
}

async function waitForEvents() {
  await waitFor(() => expect(screen.queryByText('Chargement des événements…')).toBeNull());
}

describe('header', () => {
  test('shows the day, the user and the page title', async () => {
    await renderDay();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('heading', { level: 1 })).toHaveTextContent(
      'mardi 29 septembre 2026',
    );
    expect(within(header).getByText('Basile')).toBeInTheDocument();
    expect(document.title).toBe('mardi 29 septembre 2026 · Agenda');
  });

  test('links to the previous day, today and the next day', async () => {
    await renderDay();
    const nav = screen.getByRole('navigation', { name: 'Changer de jour' });
    expect(within(nav).getByRole('link', { name: 'Jour précédent' })).toHaveAttribute(
      'href',
      '/2026-09-28',
    );
    expect(within(nav).getByRole('link', { name: 'Jour suivant' })).toHaveAttribute(
      'href',
      '/2026-09-30',
    );
    expect(within(nav).getByRole('link', { name: "Aujourd'hui" })).toHaveAttribute(
      'href',
      `/${toDateKey(new Date())}`,
    );
  });

  test('navigates between days, across months', async () => {
    db.events.push({
      id: 10,
      title: 'Octobre',
      date: '2026-10-01',
      start: '10:00',
      duration: 60,
      ownerId: 2,
      isPublic: false,
    });
    const { user, router } = await renderDay('2026-09-30');

    await user.click(screen.getByRole('link', { name: 'Jour suivant' }));
    await screen.findByRole('heading', { level: 1, name: 'jeudi 1 octobre 2026' });
    await waitForEvents();
    expect(router.state.location.pathname).toBe('/2026-10-01');
    expect(eventBlock(10)).toHaveTextContent('Octobre');

    await user.click(screen.getByRole('link', { name: 'Jour précédent' }));
    await screen.findByRole('heading', { level: 1, name: 'mercredi 30 septembre 2026' });
    await waitForEvents();
    expect(eventBlock(10)).toBeNull();
  });

  test('"Aujourd\'hui" goes to today', async () => {
    const { user, router } = await renderDay();
    await user.click(screen.getByRole('link', { name: "Aujourd'hui" }));
    await screen.findByRole('heading', { level: 1, name: formatDayTitle(toDateKey(new Date())) });
    expect(router.state.location.pathname).toBe(`/${toDateKey(new Date())}`);
  });

  test('an invalid date redirects to today', async () => {
    const { router } = renderWithRouter('/2026-02-30');
    await screen.findByRole('heading', { level: 1, name: formatDayTitle(toDateKey(new Date())) });
    expect(router.state.location.pathname).toBe(`/${toDateKey(new Date())}`);
  });
});

describe('events', () => {
  test('shows own events and public events of others only', async () => {
    await renderDay();
    for (const id of [1, 2, 3, 4]) expect(eventBlock(id)).toBeInTheDocument();
    expect(eventBlock(5)).toBeNull();
  });

  test('each event shows its id, title, start time and duration', async () => {
    await renderDay();
    const block = eventBlock(3);
    expect(block).toHaveTextContent('#3');
    expect(block).toHaveTextContent('Déjeuner');
    expect(block).toHaveTextContent('12:30 · 60 min');
  });

  test('an untitled event still shows its id', async () => {
    db.events.push({
      id: 11,
      date: DAY,
      start: '16:00',
      duration: 30,
      ownerId: 2,
      isPublic: false,
    });
    await renderDay();
    expect(eventBlock(11)).toHaveTextContent('#11');
  });

  test('public events carry a "Public" badge', async () => {
    await renderDay();
    expect(within(eventBlock(2)!).getByText('Public')).toBeInTheDocument();
    expect(within(eventBlock(3)!).queryByText('Public')).toBeNull();
  });

  test('positions an event from its time and duration', async () => {
    await renderDay();
    // 12:30 → 3.5h after 09:00 → 350px; 60min → 100px.
    expect(eventBlock(3)).toHaveStyle({
      top: '350px',
      height: '100px',
      left: '0px',
      width: '600px',
    });
  });

  test('overlapping events share the width', async () => {
    await renderDay();
    expect(eventBlock(1)).toHaveStyle({ left: '0px', width: '300px' });
    expect(eventBlock(2)).toHaveStyle({ left: '300px', width: '300px' });
  });

  test('follows the size of the grid', async () => {
    await renderDay();
    resizeTo(400, 600);
    expect(eventBlock(3)).toHaveStyle({ top: '175px', height: '50px', width: '400px' });
    expect(eventBlock(2)).toHaveStyle({ left: '200px', width: '200px' });
  });

  test('shows a loading state until the events arrive', async () => {
    let release = () => {};
    server.use(
      http.get(apiUrl('/api/events'), async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json([]);
      }),
    );
    renderWithRouter(`/${DAY}`);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des événements…');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    release();
    await waitForEvents();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
  });

  test("never shows a previous day's late response", async () => {
    let releaseFirstDay = () => {};
    server.use(
      http.get(apiUrl('/api/events'), async ({ request }) => {
        const date = new URL(request.url).searchParams.get('date');
        if (date === DAY) await new Promise<void>((resolve) => (releaseFirstDay = resolve));
        return HttpResponse.json(db.events.filter((e) => e.date === date));
      }),
    );
    db.events.push({
      id: 12,
      title: 'Lendemain',
      date: '2026-09-30',
      start: '10:00',
      duration: 60,
      ownerId: 2,
      isPublic: false,
    });
    const { user } = renderWithRouter(`/${DAY}`);

    await user.click(await screen.findByRole('link', { name: 'Jour suivant' }));
    await waitForEvents();
    releaseFirstDay();

    await waitFor(() => expect(eventBlock(12)).toBeInTheDocument());
    expect(eventBlock(1)).toBeNull();
  });

  test('shows a readable error and retries', async () => {
    server.use(
      http.get(apiUrl('/api/events'), () => new HttpResponse(null, { status: 500 }), {
        once: true,
      }),
    );
    const { user } = renderWithRouter(`/${DAY}`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Une erreur est survenue. Réessayez.');
    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(eventBlock(3)).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
