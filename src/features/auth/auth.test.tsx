import { act, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { getEvents } from '../../api/events';
import { ADMIN, BASILE, DEMO_PASSWORD, db } from '../../test/db';
import { apiUrl } from '../../test/handlers';
import { renderWithRouter } from '../../test/renderWithRouter';
import { server } from '../../test/server';
import { formatDayTitle, toDateKey } from '../calendar/time';

const today = () => toDateKey(new Date());

function loginPanel() {
  return within(screen.getByRole('tabpanel', { name: 'Connexion' }));
}

function registerPanel() {
  return within(screen.getByRole('tabpanel', { name: 'Inscription' }));
}

async function findDayPage(date: string) {
  return screen.findByRole('heading', { level: 1, name: formatDayTitle(date) });
}

describe('route protection', () => {
  test('waits for the session to be restored', () => {
    renderWithRouter('/2026-09-29');
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de la session…');
  });

  test('redirects to /login when not logged in', async () => {
    const { router } = renderWithRouter('/2026-09-29');
    expect(await screen.findByRole('tab', { name: 'Connexion' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(router.state.location.pathname).toBe('/login');
  });

  test('shows the requested day when the session is restored', async () => {
    db.sessionUserId = BASILE.id;
    renderWithRouter('/2026-09-29');
    await findDayPage('2026-09-29');
    expect(screen.getByText('Basile')).toBeInTheDocument();
  });

  test('/ redirects to today', async () => {
    db.sessionUserId = BASILE.id;
    const { router } = renderWithRouter('/');
    await findDayPage(today());
    expect(router.state.location.pathname).toBe(`/${today()}`);
  });

  test('an unknown route redirects to today', async () => {
    db.sessionUserId = BASILE.id;
    renderWithRouter('/a/b/c');
    await findDayPage(today());
  });

  test('restores the session with a single request', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/api/auth/me'), () => {
        calls++;
        return HttpResponse.json(BASILE);
      }),
    );
    renderWithRouter('/');
    await findDayPage(today());
    expect(calls).toBe(1);
  });

  test('/login redirects to today when already logged in', async () => {
    db.sessionUserId = BASILE.id;
    renderWithRouter('/login');
    await findDayPage(today());
  });
});

describe('login', () => {
  test('logs in and goes back to the requested day', async () => {
    const { user, router } = renderWithRouter('/2026-09-29');
    await screen.findByRole('tab', { name: 'Connexion' });

    await user.type(loginPanel().getByLabelText("Nom d'utilisateur"), 'admin');
    await user.type(loginPanel().getByLabelText('Mot de passe'), DEMO_PASSWORD);
    await user.click(loginPanel().getByRole('button', { name: 'Se connecter' }));

    await findDayPage('2026-09-29');
    expect(screen.getByText(ADMIN.displayName)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/2026-09-29');
  });

  test('goes to today when opening /login directly', async () => {
    const { user } = renderWithRouter('/login');
    await user.type(await screen.findByRole('textbox', { name: "Nom d'utilisateur" }), 'basile');
    await user.type(loginPanel().getByLabelText('Mot de passe'), DEMO_PASSWORD);
    await user.keyboard('{Enter}');
    await findDayPage(today());
  });

  test('shows the server message on wrong credentials and keeps the username', async () => {
    const { user } = renderWithRouter('/login');
    await user.type(await screen.findByRole('textbox', { name: "Nom d'utilisateur" }), 'admin');
    await user.type(loginPanel().getByLabelText('Mot de passe'), 'mauvais');
    await user.click(loginPanel().getByRole('button', { name: 'Se connecter' }));

    expect(await loginPanel().findByRole('alert')).toHaveTextContent('Identifiants invalides');
    expect(loginPanel().getByRole('textbox', { name: "Nom d'utilisateur" })).toHaveValue('admin');
    expect(loginPanel().getByLabelText('Mot de passe')).toHaveValue('');
  });

  test('validates the fields before calling the server', async () => {
    server.use(
      http.post(apiUrl('/api/auth/login'), () => {
        throw new Error('should not be called');
      }),
    );
    const { user } = renderWithRouter('/login');
    await user.click(await loginPanel().findByRole('button', { name: 'Se connecter' }));

    const username = loginPanel().getByRole('textbox', { name: "Nom d'utilisateur" });
    expect(await loginPanel().findByText("Le nom d'utilisateur est requis")).toBeInTheDocument();
    expect(username).toBeInvalid();
    expect(username).toHaveAccessibleDescription("Le nom d'utilisateur est requis");
    expect(loginPanel().getByLabelText('Mot de passe')).toHaveAccessibleDescription(
      'Le mot de passe est requis',
    );
  });

  test('disables the button while logging in', async () => {
    let release = () => {};
    server.use(
      http.post(apiUrl('/api/auth/login'), async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json(ADMIN);
      }),
    );
    const { user } = renderWithRouter('/login');
    await user.type(await screen.findByRole('textbox', { name: "Nom d'utilisateur" }), 'admin');
    await user.type(loginPanel().getByLabelText('Mot de passe'), DEMO_PASSWORD);
    await user.click(loginPanel().getByRole('button', { name: 'Se connecter' }));

    expect(loginPanel().getByRole('button', { name: 'Se connecter' })).toBeDisabled();
    release();
    await findDayPage(today());
  });
});

describe('register', () => {
  async function openRegisterTab() {
    const result = renderWithRouter('/login');
    await result.user.click(await screen.findByRole('tab', { name: 'Inscription' }));
    return result;
  }

  test('creates the account and logs in', async () => {
    const { user } = await openRegisterTab();
    await user.type(registerPanel().getByLabelText("Nom d'utilisateur"), 'alice');
    await user.type(registerPanel().getByLabelText('Nom affiché'), 'Alice');
    await user.type(registerPanel().getByLabelText('Mot de passe'), 'motdepasse');
    await user.click(registerPanel().getByRole('button', { name: 'Créer mon compte' }));

    await findDayPage(today());
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  test('shows "Nom d\'utilisateur déjà utilisé" on the username field', async () => {
    const { user } = await openRegisterTab();
    await user.type(registerPanel().getByLabelText("Nom d'utilisateur"), 'basile');
    await user.type(registerPanel().getByLabelText('Nom affiché'), 'Autre Basile');
    await user.type(registerPanel().getByLabelText('Mot de passe'), 'motdepasse');
    await user.click(registerPanel().getByRole('button', { name: 'Créer mon compte' }));

    const username = await registerPanel().findByRole('textbox', {
      name: "Nom d'utilisateur",
      description: "Nom d'utilisateur déjà utilisé",
    });
    expect(username).toHaveValue('basile');
    expect(registerPanel().getByLabelText('Nom affiché')).toHaveValue('Autre Basile');
  });

  test('requires every field and a password of at least 8 characters', async () => {
    const { user } = await openRegisterTab();
    await user.type(registerPanel().getByLabelText('Mot de passe'), 'court');
    await user.click(registerPanel().getByRole('button', { name: 'Créer mon compte' }));

    expect(await registerPanel().findByText("Le nom d'utilisateur est requis")).toBeInTheDocument();
    expect(registerPanel().getByText('Le nom affiché est requis')).toBeInTheDocument();
    expect(registerPanel().getByLabelText('Mot de passe')).toHaveAccessibleDescription(
      'Le mot de passe doit contenir au moins 8 caractères',
    );
  });
});

describe('logout and session loss', () => {
  test('logout goes back to /login and ends the session', async () => {
    db.sessionUserId = BASILE.id;
    const { user, router } = renderWithRouter('/2026-09-29');
    await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }));

    await screen.findByRole('tab', { name: 'Connexion' });
    expect(router.state.location.pathname).toBe('/login');
    expect(db.sessionUserId).toBeNull();
  });

  test('an expired session that cannot be refreshed goes back to /login', async () => {
    db.sessionUserId = BASILE.id;
    const { router } = renderWithRouter('/2026-09-29');
    await findDayPage('2026-09-29');

    db.sessionUserId = null; // cookies expired server-side
    await act(() => getEvents('2026-09-29').catch(() => {}));

    await screen.findByRole('tab', { name: 'Connexion' });
    expect(router.state.location.pathname).toBe('/login');
  });
});
