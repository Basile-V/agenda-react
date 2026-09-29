import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { routes } from '../router';

/** Renders the whole app (real routes and providers) at `path`, on the MSW mock backend. */
export function renderWithRouter(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <RouterProvider router={router} useTransitions={false} />
    </AuthProvider>,
  );
  return { router, user };
}
