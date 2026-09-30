import type { CalendarEvent } from '../../api/types';
import { useLocale, useMessages } from '../../i18n/useLocale';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { IconButton } from '../../ui/IconButton';
import { DeleteIcon, EditIcon } from '../../ui/icons';
import styles from './EventDetailsDialog.module.scss';
import { formatDayTitle, formatTime, parseTimeToMinutes } from './time';

type EventDetailsDialogProps = {
  event: CalendarEvent;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function EventDetailsDialog({
  event,
  canEdit,
  onEdit,
  onDelete,
  onClose,
}: EventDetailsDialogProps) {
  const locale = useLocale();
  const t = useMessages().calendar;
  const end = formatTime(parseTimeToMinutes(event.start) + event.duration);

  return (
    <Dialog title={event.title ?? t.untitledEvent(`#${event.id}`)} onClose={onClose}>
      <dl className={styles.details}>
        <dt>{t.date}</dt>
        <dd>
          <time dateTime={event.date}>{formatDayTitle(event.date, locale)}</time>
        </dd>
        <dt>{t.schedule}</dt>
        <dd>
          <time>{event.start}</time> – <time>{end}</time>
        </dd>
        <dt>{t.duration}</dt>
        <dd>{t.minutes(event.duration)}</dd>
        <dt>{t.visibility}</dt>
        <dd>{event.isPublic ? t.public : t.private}</dd>
      </dl>
      {!canEdit && <p className={styles.readOnly}>{t.readOnly}</p>}
      <div className={styles.actions}>
        {canEdit && (
          <>
            <IconButton aria-label={t.edit} onClick={onEdit}>
              <EditIcon />
            </IconButton>
            <IconButton aria-label={t.delete} className={styles.delete} onClick={onDelete}>
              <DeleteIcon />
            </IconButton>
          </>
        )}
        <Button onClick={onClose} className={styles.close}>
          {t.close}
        </Button>
      </div>
    </Dialog>
  );
}
