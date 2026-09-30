import { useMessages } from '../../i18n/useLocale';
import { Button } from '../../ui/Button';
import { DAY_END_HOUR, DAY_START_HOUR, isInDisplayedRange } from './layout';
import styles from './OutOfRangeEvents.module.scss';
import { formatTime } from './time';
import type { DisplayedEvent } from './useDayEvents';

const RANGE = `${formatTime(DAY_START_HOUR * 60)} – ${formatTime(DAY_END_HOUR * 60)}`;

type OutOfRangeEventsProps = {
  events: readonly DisplayedEvent[];
  onSelect: (event: DisplayedEvent) => void;
};

/**
 * The grid only covers DAY_START → DAY_END (kata). Events entirely outside it cannot be placed
 * there: listed here, they stay visible and can still be opened, edited and deleted.
 */
export function OutOfRangeEvents({ events, onSelect }: OutOfRangeEventsProps) {
  const t = useMessages().calendar;
  const outside = events
    .filter((event) => !isInDisplayedRange(event))
    .toSorted((a, b) => a.start.localeCompare(b.start) || a.id - b.id);
  if (outside.length === 0) return null;

  return (
    <section aria-label={t.outOfRangeLabel} className={styles.outside}>
      <p>{t.outOfRange(RANGE)}</p>
      <ul className={styles.list}>
        {outside.map((event) => (
          <li key={event.id}>
            <Button
              variant="ghost"
              className={styles.event}
              disabled={event.pending}
              aria-busy={event.pending}
              onClick={() => onSelect(event)}
            >
              <time>{event.start}</time> {event.title ?? t.untitledEvent(event.id)}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
