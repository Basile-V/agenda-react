import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './EventBlock.module.scss';
import type { DisplayedEvent } from './useDayEvents';

type EventBlockProps = {
  event: DisplayedEvent;
  /** Pixels, from layoutEvents. */
  position: { top: number; height: number; left: number; width: number };
  isOwn: boolean;
  onSelect: (event: DisplayedEvent) => void;
};

function accessibleLabel({ id, title, start, duration, isPublic }: DisplayedEvent) {
  const parts = [title ?? `Événement ${id}`, `à ${start}`, `${duration} minutes`];
  if (isPublic) parts.push('public');
  return parts.join(', ');
}

export function EventBlock({ event, position, isOwn, onSelect }: EventBlockProps) {
  const style: CSSProperties = {
    top: position.top,
    height: position.height,
    left: position.left,
    width: position.width,
  };
  const classes = [
    styles.event,
    isOwn ? styles.own : styles.other,
    event.pending && styles.pending,
  ];

  function handleKeyDown(keyboardEvent: KeyboardEvent) {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    keyboardEvent.preventDefault();
    onSelect(event);
  }

  // Awaiting the server: not interactive yet, it has no real id to open or edit.
  const interaction = event.pending
    ? { 'aria-busy': true }
    : {
        role: 'button',
        tabIndex: 0,
        'aria-label': accessibleLabel(event),
        onClick: () => onSelect(event),
        onKeyDown: handleKeyDown,
      };

  return (
    // Kata: a div (not a <button>) whose id attribute and content both carry the event id.
    <div
      id={`event-${event.id}`}
      className={classes.filter(Boolean).join(' ')}
      style={style}
      {...interaction}
    >
      <p className={styles.title}>
        <span className={styles.id}>{event.pending ? '…' : `#${event.id}`}</span> {event.title}
      </p>
      <p className={styles.meta}>
        <time>{event.start}</time> · {event.duration} min
        {event.isPublic && <span className={styles.badge}>Public</span>}
      </p>
    </div>
  );
}
