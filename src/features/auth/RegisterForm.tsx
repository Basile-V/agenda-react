import { useActionState } from 'react';
import { ApiError } from '../../api/client';
import { useMessages } from '../../i18n/useLocale';
import { getText } from '../../ui/formData';
import { SubmitButton } from '../../ui/SubmitButton';
import { TextField } from '../../ui/TextField';
import styles from './AuthForm.module.scss';
import { useAuth } from './useAuth';

const MIN_PASSWORD_LENGTH = 8;

type RegisterState = {
  values: { username: string; displayName: string };
  errors: { username?: string; displayName?: string; password?: string; form?: string };
};

const initialState: RegisterState = { values: { username: '', displayName: '' }, errors: {} };

export function RegisterForm() {
  const { register } = useAuth();
  const t = useMessages().auth;

  async function registerAction(_: RegisterState, formData: FormData): Promise<RegisterState> {
    const username = getText(formData, 'username').trim();
    const displayName = getText(formData, 'displayName').trim();
    const password = getText(formData, 'password');
    const values = { username, displayName };
    const errors: RegisterState['errors'] = {};
    if (!username) errors.username = t.usernameRequired;
    if (!displayName) errors.displayName = t.displayNameRequired;
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = t.passwordTooShort(MIN_PASSWORD_LENGTH);
    }
    if (Object.keys(errors).length > 0) return { values, errors };

    try {
      await register({ username, displayName, password });
      return initialState;
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        // The backend's only functional 400 here: the username is taken.
        return { values, errors: { username: t.usernameTaken } };
      }
      const message = error instanceof ApiError ? error.message : t.registerFailed;
      return { values, errors: { form: message } };
    }
  }

  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} noValidate className={styles.form}>
      <TextField
        label={t.username}
        name="username"
        autoComplete="username"
        required
        defaultValue={state.values.username}
        error={state.errors.username}
      />
      <TextField
        label={t.displayName}
        name="displayName"
        autoComplete="name"
        required
        defaultValue={state.values.displayName}
        error={state.errors.displayName}
      />
      <TextField
        label={t.password}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        error={state.errors.password}
      />
      {state.errors.form && (
        <p role="alert" className={styles.formError}>
          {state.errors.form}
        </p>
      )}
      <SubmitButton>{t.submitRegister}</SubmitButton>
    </form>
  );
}
