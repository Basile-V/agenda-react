import { useParams } from 'react-router';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { useCurrentUser } from '../auth/useAuth';
import { CalendarHeader } from './CalendarHeader';
import { DayGrid } from './DayGrid';
import styles from './DayPage.module.css';
import { formatDayTitle, isValidDateKey } from './time';
import { TodayRedirect } from './TodayRedirect';
import { useDayEvents } from './useDayEvents';

export function DayPage() {
  const { date = '' } = useParams();
  if (!isValidDateKey(date)) return <TodayRedirect />;
  // Keyed by date: nothing of a day's page state leaks into the next one.
  return <Day key={date} date={date} />;
}

function Day({ date }: { date: string }) {
  const user = useCurrentUser();
  const dayEvents = useDayEvents(date);

  return (
    <div className={styles.page}>
      <title>{`${formatDayTitle(date)} · Agenda`}</title>
      <CalendarHeader date={date} />
      <main className={styles.main} aria-busy={dayEvents.status === 'loading'}>
        <DayGrid
          events={dayEvents.status === 'success' ? dayEvents.events : []}
          currentUserId={user.id}
        />
        {dayEvents.status === 'loading' && (
          <div className={styles.overlay}>
            <Spinner label="Chargement des événements…" />
          </div>
        )}
        {dayEvents.status === 'error' && (
          <div className={styles.overlay}>
            <div role="alert" className={styles.error}>
              <p>{dayEvents.message}</p>
              <Button onClick={dayEvents.retry}>Réessayer</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
