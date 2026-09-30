import { Dialog } from '../../ui/Dialog';
import { Spinner } from '../../ui/Spinner';
import styles from './ServerWakeOverlay.module.scss';
import { useIsWaitingForServer } from './useIsWaitingForServer';

/**
 * A modal dialog rather than a positioned overlay: it goes to the browser's top layer, above
 * any dialog already open, and makes the rest of the page inert, keyboard included.
 */
export function ServerWakeOverlay() {
  const isWaiting = useIsWaitingForServer();
  if (!isWaiting) return null;

  return (
    <Dialog title="Le serveur se réveille…" className={styles.content}>
      <Spinner />
      <p className={styles.message}>
        Il est hébergé gratuitement et se met en veille quand personne ne l'utilise. Son réveil peut
        prendre jusqu'à quelques minutes, merci de votre patience.
      </p>
    </Dialog>
  );
}
