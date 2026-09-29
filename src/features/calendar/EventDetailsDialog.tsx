import type { CalendarEvent } from '../../api/types';
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
  const end = formatTime(parseTimeToMinutes(event.start) + event.duration);

  return (
    <Dialog title={event.title ?? `Événement #${event.id}`} onClose={onClose}>
      <dl className={styles.details}>
        <dt>Date</dt>
        <dd>
          <time dateTime={event.date}>{formatDayTitle(event.date)}</time>
        </dd>
        <dt>Horaire</dt>
        <dd>
          <time>{event.start}</time> – <time>{end}</time>
        </dd>
        <dt>Durée</dt>
        <dd>{event.duration} minutes</dd>
        <dt>Visibilité</dt>
        <dd>{event.isPublic ? 'Public' : 'Privé'}</dd>
      </dl>
      {!canEdit && (
        <p className={styles.readOnly}>Événement d'un autre utilisateur, en lecture seule.</p>
      )}
      <div className={styles.actions}>
        {canEdit && (
          <>
            <IconButton aria-label="Modifier" onClick={onEdit}>
              <EditIcon />
            </IconButton>
            <IconButton aria-label="Supprimer" className={styles.delete} onClick={onDelete}>
              <DeleteIcon />
            </IconButton>
          </>
        )}
        <Button onClick={onClose} className={styles.close}>
          Fermer
        </Button>
      </div>
    </Dialog>
  );
}
