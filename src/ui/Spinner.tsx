import styles from './Spinner.module.scss';

type SpinnerProps = {
  size?: 'small' | 'large';
  /** Announced to screen readers; omit when the surrounding text already says it. */
  label?: string;
};

export function Spinner({ size = 'large', label }: SpinnerProps) {
  const spinner = <span className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />;
  if (!label) return spinner;
  return (
    <span role="status" className={styles.status}>
      {spinner}
      <span className={styles.label}>{label}</span>
    </span>
  );
}
