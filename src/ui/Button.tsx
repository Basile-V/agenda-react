import type { ComponentProps } from 'react';
import styles from './Button.module.scss';

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' };

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
