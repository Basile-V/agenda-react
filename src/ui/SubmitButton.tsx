import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from './Button';
import { Spinner } from './Spinner';

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, 'type'>;

/** Disabled with a spinner while the parent <form action> is pending. */
export function SubmitButton({ children, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Spinner size="small" />}
      {children}
    </Button>
  );
}
