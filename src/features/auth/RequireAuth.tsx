import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from '../../ui/Spinner';
import styles from './RequireAuth.module.css';
import { useAuth } from './useAuth';

/** Layout route: renders its children only once the user is known to be logged in. */
export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();

  if (session.status === 'restoring') {
    return (
      <main className={styles.restoring}>
        <Spinner label="Chargement de la session…" />
      </main>
    );
  }
  if (session.status === 'anonymous') {
    // Remember where the user was going, to come back after logging in.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
