import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { BASILE, db, resetDb } from '../../test/db';
import { apiUrl } from '../../test/handlers';
import { renderWithRouter } from '../../test/renderWithRouter';
import { server } from '../../test/server';
import { formatDayTitle } from './time';

const DAY = '2026-09-29';

// Seed seen by Basile: #1, #2, #3 are his, #4 is a public event of admin.
beforeEach(() => {
  resetDb({ date: DAY });
  db.sessionUserId = BASILE.id;
});

function eventBlock(id: number) {
  return document.getElementById(`event-${id}`);
}

async function renderDay() {
  const result = renderWithRouter(`/${DAY}`);
  await screen.findByRole('heading', { level: 1, name: formatDayTitle(DAY) });
  await waitFor(() => expect(screen.queryByText('Chargement des événements…')).toBeNull());
  return result;
}

const heldRequests: (() => void)[] = [];

// A request left pending would keep its transition, hence every later one, from finishing.
afterEach(() => {
  for (const release of heldRequests.splice(0)) release();
});

/** Holds the next matching request until `release()` is called. */
function holdNext(method: 'post' | 'put' | 'delete', path: string) {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  heldRequests.push(release);
  server.use(
    http[method](
      apiUrl(path),
      async () => {
        await gate;
        // Fall through to the shared mock backend.
        return undefined;
      },
      { once: true },
    ),
  );
  return () => release();
}

function failNext(method: 'post' | 'put' | 'delete', path: string, status: number) {
  server.use(http[method](apiUrl(path), () => new HttpResponse(null, { status }), { once: true }));
}

describe('create', () => {
  test('the dialog opens with the displayed day and focus on the title', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));

    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    expect(within(dialog).getByLabelText('Titre')).toHaveFocus();
    expect(within(dialog).getByLabelText('Date')).toHaveValue(DAY);
    expect(within(dialog).getByLabelText('Durée (minutes)')).toHaveValue(30);
    expect(within(dialog).getByRole('checkbox', { name: /Événement public/ })).not.toBeChecked();
  });

  test('"Ajouter" is disabled until the form is valid, with a message per field', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    const submit = within(dialog).getByRole('button', { name: 'Ajouter' });
    expect(submit).toBeDisabled();

    await user.tab(); // leave the title empty
    expect(within(dialog).getByLabelText('Titre')).toHaveAccessibleDescription(
      'Le titre est requis',
    );

    await user.type(within(dialog).getByLabelText('Titre'), 'Atelier');
    expect(within(dialog).getByLabelText('Titre')).not.toHaveAccessibleDescription();
    await user.type(within(dialog).getByLabelText('Heure de début'), '15:00');
    expect(submit).toBeEnabled();

    await user.clear(within(dialog).getByLabelText('Durée (minutes)'));
    await user.type(within(dialog).getByLabelText('Durée (minutes)'), '0');
    await user.tab();
    expect(within(dialog).getByLabelText('Durée (minutes)')).toHaveAccessibleDescription(
      "La durée doit être d'au moins 1 minute",
    );
    expect(submit).toBeDisabled();
  });

  test('a field left without moving to another one still gets its message', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });

    // A tap on an empty part of the dialog: the focus goes nowhere.
    await user.click(within(dialog).getByRole('heading', { name: 'Nouvel événement' }));
    expect(within(dialog).getByLabelText('Titre')).toHaveAccessibleDescription(
      'Le titre est requis',
    );
  });

  test('switching to another window does not flag the field being filled', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    const title = within(dialog).getByLabelText('Titre');

    // No user-event equivalent: the window loses the focus, the field remains the active element.
    fireEvent.focusOut(title);
    expect(title).toHaveFocus();
    expect(title).not.toHaveAccessibleDescription();
  });

  test('the title cannot exceed what the server stores', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    expect(screen.getByLabelText('Titre')).toHaveAttribute('maxlength', '255');
  });

  test('a blank title is not a title', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    await user.type(within(dialog).getByLabelText('Titre'), '   ');
    await user.type(within(dialog).getByLabelText('Heure de début'), '15:00');
    expect(within(dialog).getByRole('button', { name: 'Ajouter' })).toBeDisabled();
  });

  test('shows the event at once, then confirms it with its server id', async () => {
    const release = holdNext('post', '/api/events');
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    await user.type(within(dialog).getByLabelText('Titre'), 'Atelier');
    await user.type(within(dialog).getByLabelText('Heure de début'), '15:00');
    await user.clear(within(dialog).getByLabelText('Durée (minutes)'));
    await user.type(within(dialog).getByLabelText('Durée (minutes)'), '45');
    await user.click(within(dialog).getByRole('checkbox', { name: /Événement public/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    // Optimistic: already on the grid, marked as pending.
    const pending = await screen.findByText('Atelier');
    expect(pending.closest('[aria-busy="true"]')).not.toBeNull();

    release();
    await waitFor(() => expect(eventBlock(6)).toHaveTextContent('#6 Atelier'));
    expect(eventBlock(6)).toHaveTextContent('15:00 · 45 min');
    expect(within(eventBlock(6)!).getByText('Public')).toBeInTheDocument();
    expect(db.events).toContainEqual(
      expect.objectContaining({
        id: 6,
        title: 'Atelier',
        start: '15:00',
        duration: 45,
        isPublic: true,
      }),
    );
  });

  test('an event created on another day does not appear on this one', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    await user.type(within(dialog).getByLabelText('Titre'), 'Demain');
    await user.clear(within(dialog).getByLabelText('Date'));
    await user.type(within(dialog).getByLabelText('Date'), '2026-09-30');
    await user.type(within(dialog).getByLabelText('Heure de début'), '10:00');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => expect(db.events.some((e) => e.title === 'Demain')).toBe(true));
    expect(screen.queryByText('Demain')).toBeNull();
  });

  test('an event created outside 09:00 → 21:00 shows up in the out-of-range list', async () => {
    const release = holdNext('post', '/api/events');
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    await user.type(within(dialog).getByLabelText('Titre'), 'Footing');
    await user.type(within(dialog).getByLabelText('Heure de début'), '07:00');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

    // Optimistic: listed at once, but not openable before the server gave it an id.
    const outside = await screen.findByRole('region', {
      name: 'Événements hors de la plage affichée',
    });
    expect(within(outside).getByRole('button', { name: '07:00 Footing' })).toBeDisabled();

    release();
    await waitFor(() =>
      expect(within(outside).getByRole('button', { name: '07:00 Footing' })).toBeEnabled(),
    );
    expect(eventBlock(6)).toBeNull();
  });

  test('when the server refuses, the event goes away and the reason is shown', async () => {
    failNext('post', '/api/events', 500);
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel événement' });
    await user.type(within(dialog).getByLabelText('Titre'), 'Raté');
    await user.type(within(dialog).getByLabelText('Heure de début'), '15:00');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'événement n'a pas pu être créé. Une erreur est survenue. Réessayez.",
    );
    await waitFor(() => expect(screen.queryByText('Raté')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Masquer le message' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('"Annuler" closes the dialog without creating anything', async () => {
    const { user } = await renderDay();
    await user.click(screen.getByRole('button', { name: 'Nouvel événement' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Nouvel événement' })).toHaveFocus();
    expect(db.events).toHaveLength(5);
  });
});

describe('details', () => {
  test('an event is a button named after its title, time and duration', async () => {
    await renderDay();
    expect(screen.getByRole('button', { name: 'Déjeuner, à 12:30, 60 minutes' })).toBe(
      eventBlock(3),
    );
    expect(screen.getByRole('button', { name: 'Revue de code, à 09:45, 60 minutes, public' })).toBe(
      eventBlock(2),
    );
  });

  test('a click opens the details of an own event, editable', async () => {
    const { user } = await renderDay();
    await user.click(eventBlock(3)!);

    const dialog = screen.getByRole('dialog', { name: 'Déjeuner' });
    expect(dialog).toHaveTextContent('Mardi 29 septembre 2026'.toLowerCase());
    expect(dialog).toHaveTextContent('12:30 – 13:30');
    expect(dialog).toHaveTextContent('60 minutes');
    expect(dialog).toHaveTextContent('Privé');
    expect(within(dialog).getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
  });

  test("someone else's event is read-only", async () => {
    const { user } = await renderDay();
    await user.click(eventBlock(4)!);

    const dialog = screen.getByRole('dialog', { name: 'Démo client' });
    expect(dialog).toHaveTextContent('Public');
    expect(dialog).toHaveTextContent('lecture seule');
    expect(within(dialog).queryByRole('button', { name: 'Modifier' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Supprimer' })).toBeNull();
  });

  test('opens with Enter, and gives the focus back to the event when closed', async () => {
    const { user } = await renderDay();
    eventBlock(3)!.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Déjeuner' });

    await user.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(eventBlock(3)).toHaveFocus();
  });
});

describe('edit', () => {
  async function openEdit(id: number) {
    const result = await renderDay();
    await result.user.click(eventBlock(id)!);
    await result.user.click(screen.getByRole('button', { name: 'Modifier' }));
    return { ...result, dialog: screen.getByRole('dialog', { name: "Modifier l'événement" }) };
  }

  test('the form is prefilled and valid', async () => {
    const { dialog } = await openEdit(3);
    expect(within(dialog).getByLabelText('Titre')).toHaveValue('Déjeuner');
    expect(within(dialog).getByLabelText('Date')).toHaveValue(DAY);
    expect(within(dialog).getByLabelText('Heure de début')).toHaveValue('12:30');
    expect(within(dialog).getByLabelText('Durée (minutes)')).toHaveValue(60);
    expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  });

  test('on the same day, the event is updated in place', async () => {
    const { user, dialog } = await openEdit(3);
    await user.clear(within(dialog).getByLabelText('Titre'));
    await user.type(within(dialog).getByLabelText('Titre'), 'Déjeuner client');
    await user.clear(within(dialog).getByLabelText('Heure de début'));
    await user.type(within(dialog).getByLabelText('Heure de début'), '13:00');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(eventBlock(3)).toHaveTextContent('Déjeuner client');
    expect(eventBlock(3)).toHaveStyle({ top: '400px' });
    await waitFor(() => expect(db.events.find((e) => e.id === 3)?.title).toBe('Déjeuner client'));
    expect(eventBlock(3)).not.toHaveAttribute('aria-busy');
  });

  test('moved to another day, the event leaves the grid', async () => {
    const { user, dialog } = await openEdit(3);
    await user.clear(within(dialog).getByLabelText('Date'));
    await user.type(within(dialog).getByLabelText('Date'), '2026-10-02');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(eventBlock(3)).toBeNull();
    await waitFor(() => expect(db.events.find((e) => e.id === 3)?.date).toBe('2026-10-02'));
    expect(eventBlock(3)).toBeNull();
  });

  test('when the server refuses, the event comes back as it was', async () => {
    failNext('put', '/api/events/:id', 404);
    const { user, dialog } = await openEdit(3);
    await user.clear(within(dialog).getByLabelText('Titre'));
    await user.type(within(dialog).getByLabelText('Titre'), 'Perdu');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'événement n'a pas pu être modifié. Cet élément n'existe plus.",
    );
    await waitFor(() => expect(eventBlock(3)).toHaveTextContent('Déjeuner'));
    expect(eventBlock(3)).not.toHaveTextContent('Perdu');
  });
});

describe('delete', () => {
  test('removes the event at once', async () => {
    const release = holdNext('delete', '/api/events/:id');
    const { user } = await renderDay();
    await user.click(eventBlock(1)!);
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(eventBlock(1)).toBeNull();
    // Its former overlap partner takes the full width again.
    expect(eventBlock(2)).toHaveStyle({ width: '600px' });

    release();
    await waitFor(() => expect(db.events.some((e) => e.id === 1)).toBe(false));
    expect(eventBlock(1)).toBeNull();
  });

  test('when the server refuses, the event comes back', async () => {
    failNext('delete', '/api/events/:id', 403);
    const { user } = await renderDay();
    await user.click(eventBlock(1)!);
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'événement n'a pas pu être supprimé. Vous n'avez pas le droit d'effectuer cette action.",
    );
    await waitFor(() => expect(eventBlock(1)).toBeInTheDocument());
  });
});

test('a pending mutation does not hold back the navigation to another day', async () => {
  const release = holdNext('delete', '/api/events/:id');
  const { user, router } = await renderDay();
  await user.click(eventBlock(1)!);
  await user.click(screen.getByRole('button', { name: 'Supprimer' }));

  await user.click(screen.getByRole('link', { name: 'Jour suivant' }));
  expect(router.state.location.pathname).toBe('/2026-09-30');
  expect(
    await screen.findByRole('heading', { level: 1, name: formatDayTitle('2026-09-30') }),
  ).toBeInTheDocument();

  // Let the deletion finish here: left pending, it would land on the next test's data.
  release();
  await waitFor(() => expect(db.events.some((e) => e.id === 1)).toBe(false));
});

test('a mutation refused after leaving its day is still reported', async () => {
  // Registered last, the held handler runs first, then falls through to the failing one.
  failNext('delete', '/api/events/:id', 500);
  const release = holdNext('delete', '/api/events/:id');
  const { user } = await renderDay();
  await user.click(eventBlock(1)!);
  await user.click(screen.getByRole('button', { name: 'Supprimer' }));

  await user.click(screen.getByRole('link', { name: 'Jour suivant' }));
  await screen.findByRole('heading', { level: 1, name: formatDayTitle('2026-09-30') });
  release();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    "L'événement n'a pas pu être supprimé. Une erreur est survenue. Réessayez.",
  );
});
