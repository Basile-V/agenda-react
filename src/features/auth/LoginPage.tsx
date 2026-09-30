import { Navigate, useLocation } from 'react-router';
import { useMessages } from '../../i18n/useLocale';
import { LanguageToggle } from '../../ui/LanguageToggle';
import { Tabs } from '../../ui/Tabs';
import { ThemeToggle } from '../../ui/ThemeToggle';
import styles from './LoginPage.module.scss';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuth } from './useAuth';

function redirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    if (typeof state.from === 'string') return state.from;
  }
  return '/';
}

export function LoginPage() {
  const { session } = useAuth();
  const location = useLocation();
  const t = useMessages().auth;

  // Logged in (just now, or already): go where the user was heading, today by default.
  if (session.status === 'authenticated') {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }

  return (
    <main className={styles.page}>
      <title>{`${t.login} · Agenda`}</title>
      <div className={styles.theme}>
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>Agenda</h1>
        <Tabs
          label={t.tabsLabel}
          tabs={[
            { id: 'login', label: t.login, panel: <LoginForm /> },
            { id: 'register', label: t.register, panel: <RegisterForm /> },
          ]}
        />
      </div>
    </main>
  );
}
