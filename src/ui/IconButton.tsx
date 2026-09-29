import type { ComponentProps } from 'react';
import styles from './IconButton.module.scss';

/** The icon is decorative: the accessible name comes from the required aria-label. */
type IconButtonProps = ComponentProps<'button'> & { 'aria-label': string };

export function IconButton({ type = 'button', className, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
