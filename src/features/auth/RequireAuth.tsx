import { Navigate, Outlet, useLocation } from 'react-router';
import { useMessages } from '../../i18n/useLocale';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import styles from './RequireAuth.module.scss';
import { useAuth } from './useAuth';

/** Layout route: renders its children only once the user is known to be logged in. */
export function RequireAuth() {
  const { session, retry } = useAuth();
  const location = useLocation();
  const t = useMessages();

  if (session.status === 'unavailable') {
    return (
      <main className={styles.restoring}>
        <div role="alert" className={styles.error}>
          <p>{t.auth.serverUnavailable}</p>
          <Button onClick={retry}>{t.common.retry}</Button>
        </div>
      </main>
    );
  }

  if (session.status === 'restoring') {
    return (
      <main className={styles.restoring}>
        <Spinner label={t.auth.restoringSession} />
      </main>
    );
  }
  if (session.status === 'anonymous') {
    // Remember where the user was going, to come back after logging in.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
