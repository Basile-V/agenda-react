import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import styles from './RequireAuth.module.scss';
import { useAuth } from './useAuth';

/** Layout route: renders its children only once the user is known to be logged in. */
export function RequireAuth() {
  const { session, retry } = useAuth();
  const location = useLocation();

  if (session.status === 'unavailable') {
    return (
      <main className={styles.restoring}>
        <div role="alert" className={styles.error}>
          <p>Le serveur ne répond pas pour le moment. Votre session n'est pas perdue.</p>
          <Button onClick={retry}>Réessayer</Button>
        </div>
      </main>
    );
  }

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
