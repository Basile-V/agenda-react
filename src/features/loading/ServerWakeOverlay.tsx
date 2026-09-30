import { useMessages } from '../../i18n/useLocale';
import { Dialog } from '../../ui/Dialog';
import { Spinner } from '../../ui/Spinner';
import styles from './ServerWakeOverlay.module.scss';
import { useIsWaitingForServer } from './useIsWaitingForServer';

/**
 * A modal dialog rather than a positioned overlay: it goes to the browser's top layer, above
 * any dialog already open, and makes the rest of the page inert, keyboard included.
 */
export function ServerWakeOverlay() {
  const t = useMessages().serverWake;
  const isWaiting = useIsWaitingForServer();
  if (!isWaiting) return null;

  return (
    <Dialog title={t.title} className={styles.content}>
      <Spinner />
      <p className={styles.message}>{t.message}</p>
    </Dialog>
  );
}
