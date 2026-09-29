import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { DayPage } from './features/calendar/DayPage';
import { TodayRedirect } from './features/calendar/TodayRedirect';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { index: true, element: <TodayRedirect /> },
      { path: ':date', element: <DayPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
