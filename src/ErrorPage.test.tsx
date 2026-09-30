import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import { routes } from './router';

function Boom(): never {
  throw new Error('secret technical detail');
}

test('a page that throws while rendering shows the error page, not the raw error', async () => {
  // React and React Router both report the error on the console: expected here.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // The errorElement of the app's own root route, around a page that throws.
  const errorElement = routes[0]?.errorElement;
  expect(errorElement).toBeDefined();
  const router = createMemoryRouter([
    { errorElement, children: [{ index: true, element: <Boom /> }] },
  ]);
  render(<RouterProvider router={router} useTransitions={false} />);

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Une erreur est survenue');
  expect(alert).not.toHaveTextContent('secret technical detail');
  expect(screen.getByRole('link', { name: "Revenir à aujourd'hui" })).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
  expect(document.title).toBe('Erreur · Agenda');
});
