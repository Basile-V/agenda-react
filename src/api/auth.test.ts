import { describe, expect, test } from 'vitest';
import { ADMIN, BASILE, DEMO_PASSWORD, db } from '../test/db';
import { getCurrentUser, login, logout, register } from './auth';

describe('login', () => {
  test('returns the user', async () => {
    await expect(login({ username: 'basile', password: DEMO_PASSWORD })).resolves.toEqual(BASILE);
  });

  test('rejects wrong credentials with the server message', async () => {
    await expect(login({ username: 'basile', password: 'nope' })).rejects.toMatchObject({
      status: 401,
      message: 'Identifiants invalides',
    });
  });
});

describe('register', () => {
  test('returns the new user', async () => {
    const user = await register({ username: 'alice', password: 'password1', displayName: 'Alice' });
    expect(user).toMatchObject({ username: 'alice', displayName: 'Alice', role: 'USER' });
  });

  test('rejects a username already taken', async () => {
    await expect(
      register({ username: 'admin', password: 'password1', displayName: 'X' }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Nom d'utilisateur déjà utilisé",
    });
  });
});

describe('session', () => {
  test('getCurrentUser rejects with 401 when logged out, without trying to refresh', async () => {
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 });
  });

  test('getCurrentUser returns the logged-in user', async () => {
    db.sessionUserId = ADMIN.id;
    await expect(getCurrentUser()).resolves.toEqual(ADMIN);
  });

  test('logout ends the session', async () => {
    await login({ username: 'admin', password: DEMO_PASSWORD });
    await logout();
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 });
  });
});
