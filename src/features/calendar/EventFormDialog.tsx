import { useCallback, useState, type FocusEvent, type FormEvent } from 'react';
import type { EventPayload } from '../../api/types';
import type { Messages } from '../../i18n/messages';
import { useMessages } from '../../i18n/useLocale';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { getText } from '../../ui/formData';
import { TextField } from '../../ui/TextField';
import styles from './EventFormDialog.module.scss';

type EventFormDialogProps = {
  title: string;
  submitLabel: string;
  initialValues: EventPayload;
  onSubmit: (payload: EventPayload) => void;
  onClose: () => void;
};

type FieldName = 'title' | 'date' | 'start' | 'duration';

type Constraint = keyof Omit<ValidityState, 'valid' | 'customError'>;

type ErrorMessages = Messages['eventForm']['errors'];

/** Per field, the message of each native constraint it can fail, in priority order. */
const MESSAGES: Record<FieldName, [Constraint, keyof ErrorMessages][]> = {
  title: [
    ['valueMissing', 'titleRequired'],
    ['patternMismatch', 'titleRequired'],
  ],
  date: [
    ['valueMissing', 'dateRequired'],
    ['badInput', 'dateInvalid'],
  ],
  start: [
    ['valueMissing', 'startRequired'],
    ['badInput', 'startFormat'],
  ],
  duration: [
    ['valueMissing', 'durationRequired'],
    ['badInput', 'durationNotANumber'],
    ['rangeUnderflow', 'durationTooShort'],
    ['stepMismatch', 'durationNotAnInteger'],
  ],
};

function isFieldName(name: string): name is FieldName {
  return name in MESSAGES;
}

/** Our message for the first failing native constraint of a field. */
function errorFor(input: HTMLInputElement, messages: ErrorMessages): string | undefined {
  if (input.validity.valid || !isFieldName(input.name)) return undefined;
  const failing = MESSAGES[input.name].find(([constraint]) => input.validity[constraint]);
  return failing ? messages[failing[1]] : input.validationMessage;
}

/**
 * Creation and edition form. Validation relies on the native constraints (required, min, step,
 * pattern); the messages appear once a field has been left, the submit button waits for a
 * valid form. Submitting hands the payload over and lets the page close the dialog.
 */
export function EventFormDialog({
  title,
  submitLabel,
  initialValues,
  onSubmit,
  onClose,
}: EventFormDialogProps) {
  const t = useMessages().eventForm;
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [isValid, setIsValid] = useState(false);

  const measureValidity = useCallback((form: HTMLFormElement | null) => {
    if (form) setIsValid(form.checkValidity());
  }, []);

  function showError(input: HTMLInputElement) {
    if (!isFieldName(input.name)) return;
    const name = input.name;
    setErrors((previous) => ({ ...previous, [name]: errorFor(input, t.errors) }));
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    // Still the active element: the window lost the focus (another tab), the field was not left.
    if (event.target instanceof HTMLInputElement && event.target !== document.activeElement) {
      showError(event.target);
    }
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    setIsValid(event.currentTarget.checkValidity());
    // Once shown, a message follows the field as the user fixes it.
    const input = event.target;
    if (input instanceof HTMLInputElement && isFieldName(input.name) && errors[input.name]) {
      showError(input);
    }
  }

  // onSubmit rather than <form action>: an action is a transition, and closing the dialog
  // would then wait for the server along with the optimistic mutation it starts.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) return;
    const formData = new FormData(event.currentTarget);
    onSubmit({
      title: getText(formData, 'title').trim(),
      date: getText(formData, 'date'),
      start: getText(formData, 'start'),
      duration: Number(getText(formData, 'duration')),
      isPublic: formData.get('isPublic') === 'on',
    });
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        ref={measureValidity}
        onSubmit={handleSubmit}
        noValidate
        className={styles.form}
        onBlur={handleBlur}
        onInput={handleInput}
      >
        <TextField
          label={t.title}
          name="title"
          required
          pattern=".*\S.*"
          // The backend's column: beyond it, the server fails with a generic error.
          maxLength={255}
          placeholder={t.titlePlaceholder}
          defaultValue={initialValues.title ?? ''}
          error={errors.title}
        />
        <TextField
          label={t.date}
          name="date"
          type="date"
          required
          defaultValue={initialValues.date}
          error={errors.date}
        />
        <div className={styles.row}>
          <TextField
            label={t.start}
            name="start"
            type="time"
            required
            defaultValue={initialValues.start}
            error={errors.start}
          />
          <TextField
            label={t.duration}
            name="duration"
            type="number"
            inputMode="numeric"
            required
            min={1}
            step={1}
            defaultValue={initialValues.duration}
            error={errors.duration}
          />
        </div>
        <label className={styles.checkbox}>
          <input type="checkbox" name="isPublic" defaultChecked={initialValues.isPublic} />
          {t.isPublic}
        </label>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" disabled={!isValid}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
