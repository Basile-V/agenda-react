import { useId, type ComponentProps } from 'react';
import styles from './TextField.module.css';

type TextFieldProps = ComponentProps<'input'> & {
  label: string;
  /** Shown under the field and linked to it for assistive technologies. */
  error?: string | undefined;
};

export function TextField({ ref, label, error, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
