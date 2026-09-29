import { Link } from 'react-router';
import { IconButton } from '../../ui/IconButton';
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from '../../ui/icons';
import { useAuth, useCurrentUser } from '../auth/useAuth';
import styles from './CalendarHeader.module.css';
import { addDays, formatDayTitle, toDateKey } from './time';

export function CalendarHeader({ date }: { date: string }) {
  const { logout } = useAuth();
  const user = useCurrentUser();
  const today = toDateKey(new Date());

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        <time dateTime={date}>{formatDayTitle(date)}</time>
      </h1>
      <nav aria-label="Changer de jour" className={styles.nav}>
        <Link to={`/${addDays(date, -1)}`} className={styles.iconLink} aria-label="Jour précédent">
          <ChevronLeftIcon />
        </Link>
        <Link
          to={`/${today}`}
          className={styles.todayLink}
          aria-current={date === today ? 'date' : undefined}
        >
          Aujourd'hui
        </Link>
        <Link to={`/${addDays(date, 1)}`} className={styles.iconLink} aria-label="Jour suivant">
          <ChevronRightIcon />
        </Link>
      </nav>
      <div className={styles.user}>
        <span>{user.displayName}</span>
        <IconButton aria-label="Se déconnecter" onClick={() => void logout()}>
          <LogoutIcon />
        </IconButton>
      </div>
    </header>
  );
}
