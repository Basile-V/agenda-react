import { Link } from 'react-router';
import { useLocale, useMessages } from '../../i18n/useLocale';
import { IconButton } from '../../ui/IconButton';
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from '../../ui/icons';
import { LanguageToggle } from '../../ui/LanguageToggle';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { useAuth, useCurrentUser } from '../auth/useAuth';
import styles from './CalendarHeader.module.scss';
import { addDays, formatDayTitle, toDateKey } from './time';

export function CalendarHeader({ date }: { date: string }) {
  const { logout } = useAuth();
  const user = useCurrentUser();
  const locale = useLocale();
  const t = useMessages();
  const today = toDateKey(new Date());

  return (
    <header className={styles.header}>
      <nav aria-label={t.calendar.dayNavigation} className={styles.nav}>
        <Link
          to={`/${addDays(date, -1)}`}
          className={styles.iconLink}
          aria-label={t.calendar.previousDay}
        >
          <ChevronLeftIcon />
        </Link>
        <Link
          to={`/${today}`}
          className={styles.todayLink}
          aria-current={date === today ? 'date' : undefined}
        >
          {t.calendar.today}
        </Link>
        <Link
          to={`/${addDays(date, 1)}`}
          className={styles.iconLink}
          aria-label={t.calendar.nextDay}
        >
          <ChevronRightIcon />
        </Link>
      </nav>
      <h1 className={styles.title}>
        <time dateTime={date}>{formatDayTitle(date, locale)}</time>
      </h1>
      <div className={styles.user}>
        <LanguageToggle />
        <ThemeToggle />
        <span>{user.displayName}</span>
        <IconButton aria-label={t.auth.logout} onClick={() => void logout()}>
          <LogoutIcon />
        </IconButton>
      </div>
    </header>
  );
}
