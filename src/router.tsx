import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { ErrorPage } from './ErrorPage';
import { LoginPage } from './features/auth/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { DayPage } from './features/calendar/DayPage';
import { TodayRedirect } from './features/calendar/TodayRedirect';

export const routes: RouteObject[] = [
  {
    // Pathless root: one error page for whatever a route throws while rendering.
    errorElement: <ErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <TodayRedirect /> },
          { path: ':date', element: <DayPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
