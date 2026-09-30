import { useMessages } from './i18n/useLocale';
import { Button } from './ui/Button';
import styles from './ErrorPage.module.scss';

/**
 * Route `errorElement`: shown instead of React Router's default screen (a raw stack trace)
 * when a page throws while rendering. The error itself is already logged by React.
 */
export function ErrorPage() {
  const t = useMessages().errorPage;

  return (
    <main className={styles.page}>
      <title>{`${t.pageTitle} · Agenda`}</title>
      <div role="alert" className={styles.card}>
        <h1 className={styles.title}>{t.heading}</h1>
        <p>{t.body}</p>
        <div className={styles.actions}>
          {/* Full page loads rather than client navigations: they start again from a clean state. */}
          <a href="/">{t.backToToday}</a>
          <Button onClick={() => window.location.reload()}>{t.reload}</Button>
        </div>
      </div>
    </main>
  );
}
