import { Spinner } from '../../ui/Spinner';
import styles from './ServerWakeOverlay.module.scss';
import { useIsWaitingForServer } from './useIsWaitingForServer';

export function ServerWakeOverlay() {
  const isWaiting = useIsWaitingForServer();
  if (!isWaiting) return null;

  return (
    <div role="status" className={styles.overlay}>
      <div className={styles.card}>
        <Spinner />
        <p className={styles.title}>Le serveur se réveille…</p>
        <p className={styles.message}>
          Il est hébergé gratuitement et se met en veille quand personne ne l'utilise. Son réveil
          peut prendre jusqu'à une minute, merci de votre patience.
        </p>
      </div>
    </div>
  );
}
