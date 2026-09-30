import { useState } from 'react';
import { useParams } from 'react-router';
import type { CalendarEvent, EventPayload } from '../../api/types';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { AddIcon, CloseIcon } from '../../ui/icons';
import { Spinner } from '../../ui/Spinner';
import { useCurrentUser } from '../auth/useAuth';
import { CalendarHeader } from './CalendarHeader';
import { DayGrid } from './DayGrid';
import styles from './DayPage.module.scss';
import { EventDetailsDialog } from './EventDetailsDialog';
import { EventFormDialog } from './EventFormDialog';
import { OutOfRangeEvents } from './OutOfRangeEvents';
import { formatDayTitle, isValidDateKey } from './time';
import { TodayRedirect } from './TodayRedirect';
import { useDayEvents } from './useDayEvents';

export function DayPage() {
  const { date = '' } = useParams();
  if (!isValidDateKey(date)) return <TodayRedirect />;
  // Keyed by date: nothing of a day's page state (open dialog, error) leaks into the next one.
  return <Day key={date} date={date} />;
}

type OpenDialog =
  | { type: 'create' }
  | { type: 'details'; event: CalendarEvent }
  | { type: 'edit'; event: CalendarEvent }
  | null;

function Day({ date }: { date: string }) {
  const user = useCurrentUser();
  const day = useDayEvents(date);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const closeDialog = () => setDialog(null);
  const showDetails = (event: CalendarEvent) => setDialog({ type: 'details', event });
  const events = day.status === 'success' ? day.events : [];

  // Optimistic: the dialog closes at once and the grid shows the change right away. If the
  // server refuses it, the change rolls back by itself and we explain why.
  function run(mutation: Promise<void>, failure: string) {
    setMutationError(null);
    mutation.catch((error: unknown) => {
      setMutationError(`${failure} ${error instanceof Error ? error.message : ''}`.trim());
    });
  }

  function create(payload: EventPayload) {
    closeDialog();
    run(day.create(payload, user.id), "L'événement n'a pas pu être créé.");
  }

  function update(event: CalendarEvent, payload: EventPayload) {
    closeDialog();
    run(day.update(event, payload), "L'événement n'a pas pu être modifié.");
  }

  function remove(event: CalendarEvent) {
    closeDialog();
    run(day.remove(event.id), "L'événement n'a pas pu être supprimé.");
  }

  return (
    <div className={styles.page}>
      <title>{`${formatDayTitle(date)} · Agenda`}</title>
      <CalendarHeader date={date} />
      {mutationError && (
        <div role="alert" className={styles.banner}>
          <p>{mutationError}</p>
          <IconButton aria-label="Masquer le message" onClick={() => setMutationError(null)}>
            <CloseIcon />
          </IconButton>
        </div>
      )}
      <OutOfRangeEvents events={events} onSelect={showDetails} />
      <main className={styles.main} aria-busy={day.status === 'loading'}>
        <DayGrid events={events} currentUserId={user.id} onSelect={showDetails} />
        {day.status === 'loading' && (
          <div className={styles.overlay}>
            <Spinner label="Chargement des événements…" />
          </div>
        )}
        {day.status === 'error' && (
          <div className={styles.overlay}>
            <div role="alert" className={styles.error}>
              <p>{day.message}</p>
              <Button onClick={day.retry}>Réessayer</Button>
            </div>
          </div>
        )}
      </main>
      <IconButton
        aria-label="Nouvel événement"
        className={styles.addButton}
        onClick={() => setDialog({ type: 'create' })}
      >
        <AddIcon />
      </IconButton>

      {dialog?.type === 'create' && (
        <EventFormDialog
          title="Nouvel événement"
          submitLabel="Ajouter"
          initialValues={{ title: '', date, start: '', duration: 30, isPublic: false }}
          onSubmit={create}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'details' && (
        <EventDetailsDialog
          event={dialog.event}
          canEdit={dialog.event.ownerId === user.id}
          onEdit={() => setDialog({ type: 'edit', event: dialog.event })}
          onDelete={() => remove(dialog.event)}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'edit' && (
        <EventFormDialog
          title="Modifier l'événement"
          submitLabel="Enregistrer"
          initialValues={dialog.event}
          onSubmit={(payload) => update(dialog.event, payload)}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
