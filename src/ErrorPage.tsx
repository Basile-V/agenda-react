import { Button } from './ui/Button';
import styles from './ErrorPage.module.scss';

/**
 * Route `errorElement`: shown instead of React Router's default screen (a raw stack trace)
 * when a page throws while rendering. The error itself is already logged by React.
 */
export function ErrorPage() {
  return (
    <main className={styles.page}>
      <title>Erreur · Agenda</title>
      <div role="alert" className={styles.card}>
        <h1 className={styles.title}>Une erreur est survenue</h1>
        <p>L'application a rencontré un problème inattendu. Vos données ne sont pas perdues.</p>
        <div className={styles.actions}>
          {/* Full page loads rather than client navigations: they start again from a clean state. */}
          <a href="/">Revenir à aujourd'hui</a>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      </div>
    </main>
  );
}
