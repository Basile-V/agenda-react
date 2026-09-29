import type { CSSProperties } from 'react';
import type { CalendarEvent } from '../../api/types';
import styles from './EventBlock.module.css';

type EventBlockProps = {
  event: CalendarEvent;
  /** Pixels, from layoutEvents. */
  position: { top: number; height: number; left: number; width: number };
  isOwn: boolean;
};

export function EventBlock({ event, position, isOwn }: EventBlockProps) {
  const style: CSSProperties = {
    top: position.top,
    height: position.height,
    left: position.left,
    width: position.width,
  };

  return (
    // Kata: a div whose id attribute and content both carry the event id.
    <div
      id={`event-${event.id}`}
      className={[styles.event, isOwn ? styles.own : styles.other].join(' ')}
      style={style}
    >
      <p className={styles.title}>
        <span className={styles.id}>#{event.id}</span> {event.title}
      </p>
      <p className={styles.meta}>
        <time>{event.start}</time> · {event.duration} min
        {event.isPublic && <span className={styles.badge}>Public</span>}
      </p>
    </div>
  );
}
