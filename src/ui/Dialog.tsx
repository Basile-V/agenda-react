import { useCallback, useId, type ReactNode } from 'react';
import styles from './Dialog.module.scss';

type DialogProps = {
  title: string;
  /**
   * Escape, backdrop click: the parent decides, by unmounting the dialog. Without it, the
   * dialog cannot be dismissed (blocking wait).
   */
  onClose?: (() => void) | undefined;
  className?: string | undefined;
  children: ReactNode;
};

/**
 * Modal <dialog>, open while mounted. The browser provides the focus trap, Escape and the
 * inert background; we give the focus back to whatever opened it.
 */
export function Dialog({ title, onClose, className, children }: DialogProps) {
  const titleId = useId();

  // Stable: a new callback on every render would close and reopen the dialog each time.
  const openModal = useCallback((dialog: HTMLDialogElement | null) => {
    if (!dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={openModal}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        // Keep React in charge of the open state: the parent unmounts us.
        event.preventDefault();
        onClose?.();
      }}
      onClick={(event) => {
        // The dialog itself only receives clicks on its backdrop, its content fills it.
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={[styles.content, className].filter(Boolean).join(' ')}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
