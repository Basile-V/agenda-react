import type { CalendarEvent } from '../../api/types';
import { useElementSize } from '../../ui/useElementSize';
import styles from './DayGrid.module.scss';
import { EventBlock } from './EventBlock';
import { DAY_END_HOUR, DAY_START_HOUR, layoutEvents } from './layout';

const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => `${String(DAY_START_HOUR + i).padStart(2, '0')}:00`,
);

type DayGridProps = {
  events: CalendarEvent[];
  currentUserId: number;
};

export function DayGrid({ events, currentUserId }: DayGridProps) {
  // Only the events area is measured: the hour column sits beside it, so the whole measured
  // width is the kata's LargeurMax.
  const [eventsAreaRef, size] = useElementSize<HTMLDivElement>();
  const positioned = layoutEvents(events, size);

  return (
    <div className={styles.grid} style={{ '--hours': HOURS.length - 1 }}>
      <ol className={styles.hours} aria-hidden="true">
        {HOURS.map((hour, i) => (
          <li key={hour} style={{ '--index': i }}>
            {hour}
          </li>
        ))}
      </ol>
      <div ref={eventsAreaRef} className={styles.events}>
        {positioned.map(({ event, ...position }) => (
          <EventBlock
            key={event.id}
            event={event}
            position={position}
            isOwn={event.ownerId === currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
