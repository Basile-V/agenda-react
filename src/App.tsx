import { RouterProvider } from 'react-router';
import { AuthProvider } from './features/auth/AuthProvider';
import { router } from './router';

export function App() {
  return (
    <AuthProvider>
      {/* Our navigations have no loaders to wait for. Wrapped in transitions (the default),
          they would be held back by any pending optimistic mutation. */}
      <RouterProvider router={router} useTransitions={false} />
    </AuthProvider>
  );
}
